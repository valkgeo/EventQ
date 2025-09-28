"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {


  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { getRoom } from "@/lib/rooms";
import { ArrowLeft } from "lucide-react";
interface ModeratedQuestion {
  id: string;
  text: string;
  status: "pending" | "accepted" | "rejected";
  createdAt?: Date;
  isAnonymous: boolean;
  participantName?: string;
  highlighted: boolean;
  likeCount?: number;
}

type FilterOption = "all" | "pending" | "accepted" | "rejected";



const filterLabels: Record<FilterOption, string> = {
  all: "Todas",
  pending: "Pendentes",
  accepted: "Aceitas",
  rejected: "Recusadas",
};

export const ModeratorView = ({ roomId }: { roomId: string }) => {
  const [room, setRoom] = useState<Awaited<ReturnType<typeof getRoom>> | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [questions, setQuestions] = useState<ModeratedQuestion[]>([]);
  const [filter, setFilter] = useState<FilterOption>("pending");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRoom = async () => {
      setLoadingRoom(true);
      const fetched = await getRoom(roomId);
      if (!fetched) {
        setError("Sala nao encontrada ou removida.");
      }
      setRoom(fetched);
      setLoadingRoom(false);
    };

    void loadRoom();
  }, [roomId]);

  useEffect(() => {
    const questionsRef = collection(db, "rooms", roomId, "questions");
    const roomQuery = query(questionsRef, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(roomQuery, (snapshot) => {
      const entries: ModeratedQuestion[] = snapshot.docs.map((document) => {
        const data = document.data();
        return {
          id: document.id,
          text: (data.text as string) ?? "",
          status: (data.status as "pending" | "accepted" | "rejected") ?? "pending",
          isAnonymous: Boolean(data.isAnonymous),
          participantName: (data.participantName as string | undefined) || undefined,
          createdAt: data.createdAt?.toDate?.(),
          highlighted: Boolean(data.highlighted),
          likeCount: typeof data.likeCount === "number" ? data.likeCount : undefined,
        };
      });
      setQuestions(entries);
    });

    return () => unsubscribe();
  }, [roomId]);

  const filteredQuestions = useMemo(() => {
    if (filter === "all") return questions;
    return questions.filter((entry) => entry.status === filter);
  }, [filter, questions]);

  const counts = useMemo(() => {
    return questions.reduce(
      (acc, entry) => {
        acc.all += 1;
        acc[entry.status] += 1;
        return acc;
      },
      { all: 0, pending: 0, accepted: 0, rejected: 0 }
    );
  }, [questions]);

  const handleUpdateStatus = async (questionId: string, status: "pending" | "accepted" | "rejected") => {
    setProcessing(true);
    try {
      await updateDoc(doc(db, "rooms", roomId, "questions", questionId), {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (updateError) {
      console.error(updateError);
      setError("Nao foi possivel atualizar a pergunta agora.");
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleHighlight = async (question: ModeratedQuestion) => {
    setProcessing(true);
    try {
      await updateDoc(doc(db, "rooms", roomId, "questions", question.id), {
        highlighted: !question.highlighted,
        highlightedAt: !question.highlighted ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      });
    } catch (highlightError) {
      console.error(highlightError);
      setError("Nao foi possivel alterar o destaque agora.");
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkStatus = async (status: "accepted" | "rejected") => {
    const target = questions.filter((entry) => entry.status !== status);
    if (target.length === 0) return;

    setProcessing(true);
    try {
      const batch = writeBatch(db);
      target.forEach((entry) => {
        const questionRef = doc(db, "rooms", roomId, "questions", entry.id);
        batch.update(questionRef, { status, updatedAt: serverTimestamp() });
      });
      await batch.commit();
    } catch (bulkError) {
      console.error(bulkError);
      setError("Nao foi possivel aplicar a acao em lote.");
    } finally {
      setProcessing(false);
    }
  };

  const handleClear = async () => {
    setProcessing(true);
    setError(null);
    try {
      const questionsRef = collection(db, "rooms", roomId, "questions");
      const snapshot = await getDocs(questionsRef);
      const batch = writeBatch(db);
      snapshot.forEach((document) => batch.delete(document.ref));
      await batch.commit();
    } catch (clearError) {
      console.error(clearError);
      setError("Nao foi possivel limpar o historico agora.");
    } finally {
      setProcessing(false);
    }
  };

  if (loadingRoom) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white/70 text-slate-500">
        <p className="animate-pulse text-sm">Carregando sala...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center text-slate-700">
        <div className="max-w-sm rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl">
          <p className="text-base font-semibold text-slate-900">{error ?? "Sala nao encontrada."}</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedEmails={[...room.allowedEmails, room.organizationEmail]}>
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Moderando</p>
            <h1 className="text-2xl font-semibold text-slate-900">{room.title}</h1>
            <p className="text-sm text-slate-600">
              Organizacao {room.organizationName} – {counts.pending} perguntas pendentes
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/hall"
              aria-label="Voltar ao hall"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-violet-200 hover:text-violet-600"
              title="Voltar ao hall"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <button
              onClick={() => void handleBulkStatus("accepted")}
              disabled={processing || counts.pending === 0}
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Aprovar todas
            </button>

            <button
              onClick={() => void handleBulkStatus("rejected")}
              disabled={processing || counts.pending === 0}
              className="inline-flex items-center justify-center rounded-full bg-rose-500 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-rose-500/20 transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Rejeitar todas
            </button>

            <button
              onClick={handleClear}
              disabled={processing || counts.all === 0}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:border-violet-200 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Limpar historico
            </button>
          </div>
        </header>

        <section className="flex flex-wrap gap-2">
          {(Object.keys(filterLabels) as FilterOption[]).map((option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                filter === option
                  ? "border-violet-200 bg-violet-50 text-violet-600"
                  : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-600"
              }`}
            >
              {filterLabels[option]} ({counts[option] ?? 0})
            </button>
          ))}
        </section>

        {error && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600">{error}</div>
        )}

        <section className="grid gap-4 pb-16">
          {filteredQuestions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-8 text-sm text-slate-500">
              Nenhuma pergunta nesta categoria por enquanto.
            </div>
          ) : (
            filteredQuestions.map((question) => (
              <article
                key={question.id}
                className={`flex flex-col gap-4 rounded-3xl border p-6 shadow-lg backdrop-blur ${
                  question.highlighted
                    ? "border-violet-200 bg-violet-50/80"
                    : "border-slate-200 bg-white/90"
                }`}
              >
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-slate-900">{question.text}</p>
                  <p className="text-xs text-slate-500">
                    {question.isAnonymous ? "Anonimo" : question.participantName || "Participante"}
                    {question.createdAt && ` – ${question.createdAt.toLocaleTimeString()}`}
                  </p>
                  {question.likeCount !== undefined && question.likeCount > 0 && (
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-medium text-violet-600">
                      Destaque com {question.likeCount} {question.likeCount === 1 ? "curtida" : "curtidas"}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                      question.status === "accepted"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                        : question.status === "rejected"
                        ? "border-rose-200 bg-rose-50 text-rose-600"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                    }`}
                  >
                    {question.status === "accepted"
                      ? "Aceita"
                      : question.status === "rejected"
                      ? "Recusada"
                      : "Pendente"}
                  </span>
                  <button
                    onClick={() => void handleUpdateStatus(question.id, "accepted")}
                    disabled={processing || question.status === "accepted"}
                    className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Aprovar
                  </button>
                  <button
                    onClick={() => void handleUpdateStatus(question.id, "rejected")}
                    disabled={processing || question.status === "rejected"}
                    className="inline-flex items-center justify-center rounded-full bg-rose-500 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-rose-500/20 transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Rejeitar
                  </button>
                  {question.status !== "pending" && (
                    <button
                      onClick={() => void handleUpdateStatus(question.id, "pending")}
                      disabled={processing}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:border-violet-200 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Voltar para pendente
                    </button>
                  )}
                  <button
                    onClick={() => void handleToggleHighlight(question)}
                    disabled={processing}
                    className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-medium transition ${
                      question.highlighted
                        ? "border border-violet-300 bg-white text-violet-600 hover:border-violet-400"
                        : "bg-violet-600 text-white shadow-lg shadow-violet-600/20 hover:bg-violet-500"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {question.highlighted ? "Remover destaque" : "Destacar"}
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </ProtectedRoute>
  );
};
