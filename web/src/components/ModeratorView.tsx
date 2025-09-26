"use client";

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
import { getRoom } from "@/lib/rooms";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SignOutButton } from "@/components/SignOutButton";

interface ModeratedQuestion {
  id: string;
  text: string;
  status: "pending" | "accepted" | "rejected";
  createdAt?: Date;
  isAnonymous: boolean;
  participantName?: string;
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
        setError("Sala não encontrada ou removida.");
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
      setError("Não foi possível atualizar a pergunta agora.");
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
      setError("Não foi possível aplicar a ação em lote.");
    } finally {
      setProcessing(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm("Remover todas as perguntas? Esta ação não pode ser desfeita.")) return;

    setProcessing(true);
    try {
      const snapshot = await getDocs(collection(db, "rooms", roomId, "questions"));
      const batch = writeBatch(db);
      snapshot.docs.forEach((document) => {
        batch.delete(document.ref);
      });
      await batch.commit();
    } catch (clearError) {
      console.error(clearError);
      setError("Não foi possível limpar o histórico agora.");
    } finally {
      setProcessing(false);
    }
  };

  if (loadingRoom) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <p className="animate-pulse text-sm">Preparando moderação...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-center text-slate-200">
        <div className="max-w-sm rounded-3xl border border-slate-800/80 bg-slate-900/60 p-8">
          <p className="text-base font-semibold">{error || "Sala inacessível."}</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedEmails={room.allowedEmails}>
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Moderando</p>
            <h1 className="text-2xl font-semibold text-slate-100">{room.title}</h1>
            <p className="text-sm text-slate-400">
              Organização {room.organizationName} · {counts.pending} perguntas pendentes
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => void handleBulkStatus("accepted")}
              disabled={processing || counts.pending === 0}
              className="inline-flex items-center justify-center rounded-full bg-emerald-400/90 px-4 py-2 text-xs font-medium text-emerald-900 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Aprovar todas
            </button>
            <button
              onClick={() => void handleBulkStatus("rejected")}
              disabled={processing || counts.pending === 0}
              className="inline-flex items-center justify-center rounded-full bg-rose-400/90 px-4 py-2 text-xs font-medium text-rose-950 transition hover:bg-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Rejeitar todas
            </button>
            <button
              onClick={handleClear}
              disabled={processing || counts.all === 0}
              className="inline-flex items-center justify-center rounded-full border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Limpar histórico
            </button>
            <SignOutButton />
          </div>
        </header>

        <section className="flex flex-wrap gap-2">
          {(Object.keys(filterLabels) as FilterOption[]).map((option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                filter === option
                  ? "border-slate-100 bg-slate-100/10 text-slate-100"
                  : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
              }`}
            >
              {filterLabels[option]} ({counts[option] ?? 0})
            </button>
          ))}
        </section>

        {error && (
          <div className="rounded-3xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}

        <section className="grid gap-4 pb-16">
          {filteredQuestions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-700/60 bg-slate-900/30 p-8 text-sm text-slate-400">
              Nenhuma pergunta nesta categoria por enquanto.
            </div>
          ) : (
            filteredQuestions.map((question) => (
              <article
                key={question.id}
                className="flex flex-col gap-4 rounded-3xl border border-slate-800/80 bg-slate-900/40 p-6 shadow-lg backdrop-blur"
              >
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-slate-100">{question.text}</p>
                  <p className="text-xs text-slate-500">
                    {question.isAnonymous ? "Anônimo" : question.participantName || "Participante"}
                    {question.createdAt && ` · ${question.createdAt.toLocaleTimeString()}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                      question.status === "accepted"
                        ? "border-emerald-400/60 text-emerald-300"
                        : question.status === "rejected"
                        ? "border-rose-400/60 text-rose-300"
                        : "border-slate-600 text-slate-400"
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
                    className="inline-flex items-center justify-center rounded-full bg-emerald-400/90 px-4 py-2 text-xs font-medium text-emerald-900 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Aprovar
                  </button>
                  <button
                    onClick={() => void handleUpdateStatus(question.id, "rejected")}
                    disabled={processing || question.status === "rejected"}
                    className="inline-flex items-center justify-center rounded-full bg-rose-400/90 px-4 py-2 text-xs font-medium text-rose-950 transition hover:bg-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Rejeitar
                  </button>
                  {question.status !== "pending" && (
                    <button
                      onClick={() => void handleUpdateStatus(question.id, "pending")}
                      disabled={processing}
                      className="inline-flex items-center justify-center rounded-full border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Voltar para pendente
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </ProtectedRoute>
  );
};

