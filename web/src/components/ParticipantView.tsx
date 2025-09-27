"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getRoom } from "@/lib/rooms";
import { sanitizeQuestion } from "@/lib/profanityFilter";
import { useParticipantId } from "@/hooks/useParticipantId";
import { useAuth } from "@/context/AuthContext";

interface ParticipantQuestion {
  id: string;
  text: string;
  status: string;
  createdAt?: Date;
  isAnonymous: boolean;
  participantName?: string;
}

export const ParticipantView = ({ roomId }: { roomId: string }) => {
  const participantId = useParticipantId();
  const { user } = useAuth();
  const [roomName, setRoomName] = useState<string>("");
  const [allowedEmails, setAllowedEmails] = useState<string[]>([]);
  const [isRoomLoading, setIsRoomLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [participantName, setParticipantName] = useState("");
  const [sending, setSending] = useState(false);
  const [questions, setQuestions] = useState<ParticipantQuestion[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRoom = async () => {
      setIsRoomLoading(true);
      const room = await getRoom(roomId);
      if (!room) {
        setError("Sala nao encontrada ou indisponivel.");
      } else {
        setRoomName(room.title);
        setAllowedEmails(room.allowedEmails);
      }
      setIsRoomLoading(false);
    };

    void loadRoom();
  }, [roomId]);

  useEffect(() => {
    if (!participantId) return;

    const questionsRef = collection(db, "rooms", roomId, "questions");
    const roomQuery = query(
      questionsRef,
      where("participantId", "==", participantId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      roomQuery,
      (snapshot) => {
        const entries: ParticipantQuestion[] = snapshot.docs.map((document) => {
          const data = document.data();
          return {
            id: document.id,
            text: (data.text as string) ?? "",
            status: (data.status as string) ?? "pending",
            isAnonymous: Boolean(data.isAnonymous),
            participantName: (data.participantName as string | undefined) || undefined,
            createdAt: data.createdAt?.toDate?.(),
          };
        });
        setQuestions(entries);
      },
      (subscriptionError) => {
        console.error(subscriptionError);
        setError("Nao foi possivel carregar seu historico agora.");
      }
    );

    return () => unsubscribe();
  }, [participantId, roomId]);

  const canSubmit = useMemo(() => {
    if (!participantId) return false;
    const sanitized = sanitizeQuestion(question);
    return sanitized.replace(/\*/g, "").trim().length >= 3;
  }, [participantId, question]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!participantId || !canSubmit) return;

    setSending(true);
    setFeedback(null);
    setError(null);

    try {
      const cleaned = sanitizeQuestion(question);
      const questionsRef = collection(db, "rooms", roomId, "questions");
      const docRef = await addDoc(questionsRef, {
        text: cleaned,
        participantId,
        participantName: isAnonymous ? null : participantName.trim() || null,
        isAnonymous,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setQuestions((current) => [
        {
          id: docRef.id,
          text: cleaned,
          status: "pending",
          isAnonymous,
          participantName: isAnonymous ? undefined : participantName.trim() || undefined,
          createdAt: new Date(),
        },
        ...current,
      ]);

      setQuestion("");
      setParticipantName("");
      setFeedback("Pergunta enviada. Obrigado!");
    } catch (submissionError) {
      console.error(submissionError);
      setError("Nao foi possivel enviar sua pergunta agora.");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (questionId: string) => {
    setError(null);
    try {
      await deleteDoc(doc(db, "rooms", roomId, "questions", questionId));
      setQuestions((current) => current.filter((entry) => entry.id !== questionId));
      setFeedback("Pergunta removida.");
    } catch (removeError) {
      console.error(removeError);
      setError("Nao foi possivel remover agora.");
    }
  };

  const canModerate = useMemo(() => {
    const email = user?.email?.toLowerCase();
    if (!email) return false;
    return allowedEmails.map((item) => item.toLowerCase()).includes(email);
  }, [allowedEmails, user?.email]);

  if (isRoomLoading || !participantId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white/70 text-slate-500">
        <p className="animate-pulse text-sm">Carregando sala...</p>
      </div>
    );
  }

  if (error && !roomName) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center text-slate-700">
        <div className="max-w-sm rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl">
          <p className="text-base font-semibold text-slate-900">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Sala</p>
          <h1 className="text-2xl font-semibold text-slate-900">Envie sua pergunta</h1>
          <p className="text-sm text-slate-600">{roomName}</p>
        </div>
        {user && (
          <div className="flex flex-wrap gap-3">
            <Link
              href="/hall"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:border-violet-200 hover:text-violet-600"
            >
              Voltar ao hall
            </Link>
            {canModerate && (
              <Link
                href={`/rooms/${roomId}/moderate`}
                className="inline-flex items-center justify-center rounded-full bg-violet-600 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500"
              >
                Acessar moderacao
              </Link>
            )}
          </div>
        )}
      </header>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl backdrop-blur"
      >
        <fieldset className="flex flex-col gap-4" disabled={sending}>
          <div className="flex flex-col gap-2">
            <label htmlFor="question" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Pergunta
            </label>
            <textarea
              id="question"
              required
              rows={4}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Qual e a sua duvida?"
              className="resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
            <p className="text-xs text-slate-500">O EventQ filtra palavroes automaticamente antes de enviar.</p>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-3 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(event) => setIsAnonymous(event.target.checked)}
              className="h-4 w-4 rounded border border-slate-300 text-violet-600 focus:ring-violet-400"
            />
            Enviar como anonimo
          </label>

          {!isAnonymous && (
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Nome
              </label>
              <input
                id="name"
                value={participantName}
                onChange={(event) => setParticipantName(event.target.value)}
                placeholder="Como voce gostaria de ser identificado"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>
          )}

          {feedback && (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{feedback}</p>
          )}
          {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit || sending}
            className="inline-flex items-center justify-center rounded-full bg-violet-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? "Enviando..." : "Enviar pergunta"}
          </button>
        </fieldset>
      </form>

      <section className="mb-12 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl backdrop-blur">
        <header className="mb-4 flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-slate-900">Minhas perguntas</h2>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Visivel apenas para voce</p>
        </header>

        {questions.length === 0 ? (
          <p className="text-sm text-slate-600">
            Nenhuma pergunta enviada ainda. Compartilhe sua primeira duvida com o moderador!
          </p>
        ) : (
          <ul className="grid gap-4">
            {questions.map((entry) => (
              <li key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-900">{entry.text}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full border border-slate-200 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                    {entry.status === "accepted"
                      ? "Aceita"
                      : entry.status === "rejected"
                      ? "Recusada"
                      : "Pendente"}
                  </span>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-xs font-medium text-violet-600 underline underline-offset-4 transition hover:text-violet-500"
                  >
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
