"use client";

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
  const [roomName, setRoomName] = useState<string>("");
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
        setError("Sala não encontrada ou indisponível.");
      } else {
        setRoomName(room.title);
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

    const unsubscribe = onSnapshot(roomQuery, (snapshot) => {
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
    });

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
      await addDoc(questionsRef, {
        text: cleaned,
        participantId,
        participantName: isAnonymous ? null : participantName.trim() || null,
        isAnonymous,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setQuestion("");
      setParticipantName("");
      setFeedback("Pergunta enviada. Obrigado!");
    } catch (submissionError) {
      console.error(submissionError);
      setError("Não foi possível enviar sua pergunta agora.");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (questionId: string) => {
    setError(null);
    try {
      await deleteDoc(doc(db, "rooms", roomId, "questions", questionId));
      setFeedback("Pergunta removida.");
    } catch (removeError) {
      console.error(removeError);
      setError("Não foi possível remover agora.");
    }
  };

  if (isRoomLoading || !participantId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <p className="animate-pulse text-sm">Carregando sala...</p>
      </div>
    );
  }

  if (error && !roomName) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-center text-slate-200">
        <div className="max-w-sm rounded-3xl border border-slate-800/80 bg-slate-900/60 p-8">
          <p className="text-base font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-3 text-center">
        <h1 className="text-2xl font-semibold text-slate-100">Envie sua pergunta</h1>
        <p className="text-sm text-slate-400">Sala {roomName}</p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-slate-800/80 bg-slate-900/40 p-8 shadow-xl backdrop-blur"
      >
        <fieldset className="flex flex-col gap-4" disabled={sending}>
          <div className="flex flex-col gap-2">
            <label htmlFor="question" className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Pergunta
            </label>
            <textarea
              id="question"
              required
              rows={4}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Qual é a sua dúvida?"
              className="resize-none rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-slate-500"
            />
            <p className="text-xs text-slate-500">O EventQ filtra palavrões automaticamente antes de enviar.</p>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(event) => setIsAnonymous(event.target.checked)}
              className="h-4 w-4 rounded border border-slate-600 bg-slate-950 text-slate-100 focus:ring-slate-400"
            />
            Enviar como anônimo
          </label>

          {!isAnonymous && (
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Nome
              </label>
              <input
                id="name"
                value={participantName}
                onChange={(event) => setParticipantName(event.target.value)}
                placeholder="Como você gostaria de ser identificado"
                className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-slate-500"
              />
            </div>
          )}

          {feedback && <p className="rounded-2xl border border-emerald-500/50 bg-emerald-500/10 p-3 text-sm text-emerald-200">{feedback}</p>}
          {error && <p className="rounded-2xl border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit || sending}
            className="inline-flex items-center justify-center rounded-full bg-slate-100 px-6 py-3 text-sm font-medium text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Enviando..." : "Enviar pergunta"}
          </button>
        </fieldset>
      </form>

      <section className="mb-12 rounded-3xl border border-slate-800/80 bg-slate-900/40 p-8 shadow-xl backdrop-blur">
        <header className="mb-4 flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-slate-100">Minhas perguntas</h2>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">visível apenas para você</p>
        </header>

        {questions.length === 0 ? (
          <p className="text-sm text-slate-400">
            Nenhuma pergunta enviada ainda. Compartilhe sua primeira dúvida com o moderador!
          </p>
        ) : (
          <ul className="grid gap-4">
            {questions.map((entry) => (
              <li key={entry.id} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                <p className="text-sm text-slate-200">{entry.text}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                    {entry.status === "accepted"
                      ? "Aceita"
                      : entry.status === "rejected"
                      ? "Recusada"
                      : "Pendente"}
                  </span>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-xs text-slate-400 underline underline-offset-4 transition hover:text-slate-200"
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
