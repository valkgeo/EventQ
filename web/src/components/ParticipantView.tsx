"use client";

import Link from "next/link";
import QRCode from "react-qr-code";
import { useEffect, useMemo, useRef, useState } from "react";
import { FirebaseError } from "firebase/app";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  increment,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { getRoom } from "@/lib/rooms";
import { sanitizeQuestion } from "@/lib/profanityFilter";
import { signInAnonymously } from "firebase/auth";
import { useAuth } from "@/context/AuthContext";

const JOINED_ROOMS_KEY = "eventq-joined-rooms";

interface ParticipantQuestion {
  id: string;
  text: string;
  status: string;
  createdAt?: Date;
  isAnonymous: boolean;
  participantName?: string;
  participantId?: string;
  highlighted?: boolean;
  highlightedAt?: Date; 
  likeCount?: number;
  likedBy?: string[];
}

type QuestionDoc = {
  text?: string;
  status?: "pending" | "accepted" | "rejected" | string;
  isAnonymous?: boolean;
  participantName?: string | null;
  participantId?: string | null;
  createdAt?: { toDate?: () => Date };
  highlighted?: boolean;
  highlightedAt?: { toDate?: () => Date }
  likedBy?: string[];
  likeCount?: number;
};

const readJoinedRooms = () => {
  if (typeof window === "undefined") return [] as string[];
  try {
    const stored = window.localStorage.getItem(JOINED_ROOMS_KEY);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
};

const writeJoinedRooms = (rooms: string[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(JOINED_ROOMS_KEY, JSON.stringify(rooms));
};

export const ParticipantView = ({ roomId }: { roomId: string }) => {
  // >>> declare user first
  const { user, loading: authLoading } = useAuth();
  // >>> then compute participantId from the authenticated user
  const participantId: string | null = user?.uid ?? null;

  const [roomName, setRoomName] = useState<string>("");
  const [allowedEmails, setAllowedEmails] = useState<string[]>([]);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [isRoomLoading, setIsRoomLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [participantName, setParticipantName] = useState("");
  const [sending, setSending] = useState(false);
  const [questions, setQuestions] = useState<ParticipantQuestion[]>([]);
  const [highlightedQuestions, setHighlightedQuestions] = useState<ParticipantQuestion[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [likingQuestionId, setLikingQuestionId] = useState<string | null>(null);
  const attemptedAnonymousSignIn = useRef(false);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  const clearFeedbackTimer = () => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
  };

  const showFeedbackMessage = (message: string | null, autoDismissMs?: number) => {
    clearFeedbackTimer();
    setFeedback(message);
    if (autoDismissMs) {
      feedbackTimeoutRef.current = setTimeout(() => {
        setFeedback(null);
        feedbackTimeoutRef.current = null;
      }, autoDismissMs);
    }
  };

  useEffect(() => {
    return () => {
      clearFeedbackTimer();
    };
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const rooms = readJoinedRooms();
    if (!rooms.includes(roomId)) {
      writeJoinedRooms([roomId, ...rooms]);
    }
  }, [roomId]);

  useEffect(() => {
    if (authLoading) return;
    if (user) return;
    if (attemptedAnonymousSignIn.current) return;

    attemptedAnonymousSignIn.current = true;

    signInAnonymously(auth).catch((anonError) => {
      console.error(anonError);
      const code = anonError instanceof FirebaseError ? anonError.code : null;
      const details = code ? ` (codigo: ${code})` : "";
      setRoomError(`Nao foi possivel entrar na sala agora${details}. Atualize a pagina ou tente novamente mais tarde.`);
      setIsRoomLoading(false);
    });
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    let isMounted = true;

    const loadRoom = async () => {
      setIsRoomLoading(true);
      setRoomError(null);

      try {
        const room = await getRoom(roomId);
        if (!room) {
          if (!isMounted) return;
          setRoomName("");
          setAllowedEmails([]);
          setRoomError("Sala nao encontrada ou indisponivel. Verifique o link com a organizacao.");
          return;
        }

        if (!isMounted) return;
        setRoomName(room.title);
        setAllowedEmails(room.allowedEmails);
      } catch (loadError) {
        console.error(loadError);
        if (!isMounted) return;
        setRoomName("");
        setAllowedEmails([]);
        const code = loadError instanceof FirebaseError ? loadError.code : null;
        const details = code ? ` (codigo: ${code})` : "";
        setRoomError(`Nao foi possivel carregar esta sala agora${details}. Tente novamente ou solicite um novo link.`);
      } finally {
        if (!isMounted) return;
        setIsRoomLoading(false);
      }
    };

    void loadRoom();

    return () => {
      isMounted = false;
    };
  }, [roomId, authLoading, user]);

    useEffect(() => {
    if (!participantId || !roomId || isRoomLoading || roomError) return;

    const questionsRef = collection(db, "rooms", roomId, "questions");
    const roomQuery = query(
      questionsRef,
      where("participantId", "==", participantId)
    );

    const unsubscribe = onSnapshot(
      roomQuery,
      (snapshot) => {
        const entries: ParticipantQuestion[] = snapshot.docs.map((document) => {
          const data = document.data() as QuestionDoc; // se usou o tipo do patch anterior
          return {
            id: document.id,
            text: data.text ?? "",
            status: (data.status as string) ?? "pending",
            isAnonymous: !!data.isAnonymous,
            participantName: (data.participantName as string | undefined) || undefined,
            participantId: (data.participantId as string | undefined) || undefined,
            createdAt: data.createdAt?.toDate?.(),
            highlighted: !!data.highlighted,
            likeCount:
              typeof data.likeCount === "number"
                ? data.likeCount
                : Array.isArray(data.likedBy) ? data.likedBy.length : 0,
            likedBy: (data.likedBy as string[]) ?? [],
          };
        })
        // ordena no cliente por createdAt desc
        .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));

        setQuestions(entries);
      },
      (err) => {
        console.error("onSnapshot (minhas perguntas) falhou:", err);
        // opcional: mostre um aviso amigável
        // setRoomError("Não foi possível carregar suas perguntas agora.");
      }
    );


    return () => unsubscribe();
  }, [participantId, roomId, isRoomLoading, roomError]);


  useEffect(() => {
    if (isRoomLoading || roomError) return;

    const questionsRef = collection(db, "rooms", roomId, "questions");
    const highlightedOnly = query(
      questionsRef,
      where("highlighted", "==", true)
    );

    const unsubscribe = onSnapshot(
      highlightedOnly,
      (snapshot) => {
        const entries: ParticipantQuestion[] = snapshot.docs
          .map((document) => {
            const data = document.data() as QuestionDoc;
            return {
              id: document.id,
              text: data.text ?? "",
              status: (data.status as string) ?? "pending",
              isAnonymous: !!data.isAnonymous,
              participantName: (data.participantName as string | undefined) || undefined,
              createdAt: data.createdAt?.toDate?.(),
              highlighted: true,
              highlightedAt: data.highlightedAt?.toDate?.(), // <— pega o carimbo do destaque
              likeCount:
                typeof data.likeCount === "number"
                  ? data.likeCount
                  : Array.isArray(data.likedBy) ? data.likedBy.length : 0,
              likedBy: (data.likedBy as string[]) ?? [],
            };
          })
          // ordena no cliente por highlightedAt desc (fallback para createdAt)
          .sort((a, b) =>
            (b.highlightedAt?.getTime() ?? b.createdAt?.getTime() ?? 0) -
            (a.highlightedAt?.getTime() ?? a.createdAt?.getTime() ?? 0)
          );

        setHighlightedQuestions(entries);
      },
      (err) => {
        console.error("onSnapshot (destaques) falhou:", err);
      }
    );


    return () => unsubscribe();
  }, [roomId, isRoomLoading, roomError]);

  const canSubmit = useMemo(() => {
    if (!participantId) return false;
    const sanitized = sanitizeQuestion(question).replace(/\*/g, "").trim();
    const hasEnoughChars = sanitized.length >= 5;
    const hasIdentity = isAnonymous || participantName.trim().length > 0;
    return hasEnoughChars && hasIdentity;
  }, [participantId, question, isAnonymous, participantName]);

  const shareUrl = useMemo(() => {
    if (typeof window !== "undefined") {
      const base = window.location.origin;
      return `${base}/rooms/${roomId}/participate`;
    }
    return `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/rooms/${roomId}/participate`;
  }, [roomId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!participantId || !canSubmit) return;

    setSending(true);
    showFeedbackMessage(null);
    

    try {
      const cleaned = sanitizeQuestion(question);
      const questionsRef = collection(db, "rooms", roomId, "questions");
      await addDoc(questionsRef, {
        text: cleaned,
        participantId, // usa o user.uid
        participantName: isAnonymous ? null : participantName.trim() || null,
        isAnonymous,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        highlighted: false,
        highlightedAt: null,
        likedBy: [],
        likeCount: 0,
      });


      setQuestion("");
      setParticipantName("");
      showFeedbackMessage("Pergunta enviada. Aguarde a Moderacao!", 2000);
    } catch (submissionError) {
      console.error(submissionError);
      showFeedbackMessage("Nao foi possivel enviar sua pergunta agora.");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (questionId: string) => {
    
    try {
      await deleteDoc(doc(db, "rooms", roomId, "questions", questionId));
      setQuestions((current) => current.filter((entry) => entry.id !== questionId));
      setHighlightedQuestions((current) => current.filter((entry) => entry.id !== questionId));
      showFeedbackMessage("Pergunta removida.", 2000);
    } catch (removeError) {
      console.error(removeError);
      showFeedbackMessage("Nao foi possivel remover agora.");
    }
  };

  const handleToggleLike = async (questionToToggle: ParticipantQuestion) => {
    if (!participantId || isRoomLoading || roomError) return;
    setLikingQuestionId(questionToToggle.id);
    try {
      const questionRef = doc(db, "rooms", roomId, "questions", questionToToggle.id);
      const alreadyLiked = questionToToggle.likedBy?.includes(participantId);
      await updateDoc(questionRef, {
        likedBy: alreadyLiked ? arrayRemove(participantId) : arrayUnion(participantId),
        likeCount: increment(alreadyLiked ? -1 : 1),
        updatedAt: serverTimestamp(),
      });
    } catch (likeError) {
      console.error(likeError);
    } finally {
      setLikingQuestionId(null);
    }
  };

  const handleLeaveRoom = () => {
    const confirmation = window.confirm("Deseja sair desta sala? Suas perguntas permanecerao registradas.");
    if (!confirmation) return;
    const rooms = readJoinedRooms().filter((id) => id !== roomId);
    writeJoinedRooms(rooms);
    window.location.href = "/dashboard";
  };

  const canModerate = useMemo(() => {
    const email = user?.email?.toLowerCase();
    if (!email) return false;
    return allowedEmails.map((item) => item.toLowerCase()).includes(email);
  }, [allowedEmails, user?.email]);

  const highlightLikeLabel = (entry: ParticipantQuestion) => {
    const total = entry.likeCount ?? 0;
    return total > 0 ? `${total}` : "0";
  };

  const personalQuestionClasses = (status: string) => {
    switch (status) {
      case "accepted":
        return "border-emerald-200 bg-emerald-50";
      case "rejected":
        return "border-rose-200 bg-rose-50";
      default:
        return "border-amber-200 bg-amber-50";
    }
  };

  const personalBadgeClasses = (status: string) => {
    switch (status) {
      case "accepted":
        return "border-emerald-300 bg-emerald-100 text-emerald-700";
      case "rejected":
        return "border-rose-300 bg-rose-100 text-rose-700";
      default:
        return "border-amber-300 bg-amber-100 text-amber-700";
    }
  };

  if (isRoomLoading || !participantId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white/70 text-slate-500">
        <p className="animate-pulse text-sm">Carregando sala...</p>
      </div>
    );
  }

  if (roomError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white/80 px-6 text-center text-slate-700">
        <p className="text-lg font-semibold text-slate-900">Nao foi possivel carregar a sala</p>
        <p className="max-w-md text-sm text-slate-600">{roomError}</p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:border-violet-200 hover:text-violet-600"
        >
          Voltar para o inicio
        </Link>
      </div>
    );
  }

  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(`Envie suas perguntas na sala ${roomName}: ${shareUrl}`)}`;
  const telegramLink = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Envie suas perguntas na sala ${roomName}`)}`;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Sala</p>
          <h1 className="text-2xl font-semibold text-slate-900">Envie sua pergunta</h1>
          <p className="text-sm text-slate-600">{roomName}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleLeaveRoom}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:border-rose-200 hover:text-rose-500"
          >
            Sair da sala
          </button>
          {canModerate && (
            <Link
              href={`/rooms/${roomId}/moderate`}
              className="inline-flex items-center justify-center rounded-full bg-violet-600 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500"
            >
              Acessar moderacao
            </Link>
          )}
        </div>
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
              placeholder="Qual e a sua pergunta?"
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
              <li key={entry.id} className={`rounded-2xl border p-5 shadow-sm ${personalQuestionClasses(entry.status)}`}>
                <p className="text-sm text-slate-900">{entry.text}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${personalBadgeClasses(entry.status)}`}>
                    {entry.status === "accepted"
                      ? "Aceita"
                      : entry.status === "rejected"
                      ? "Recusada"
                      : "Pergunta Enviada"}
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

      {highlightedQuestions.length > 0 && (
        <section className="rounded-3xl border border-violet-200 bg-violet-50/80 p-8 shadow-xl backdrop-blur">
          <h2 className="mb-4 text-lg font-semibold text-violet-700">Perguntas em destaque</h2>
          <ul className="grid gap-4">
            {highlightedQuestions.map((entry) => {
              const hasLiked = participantId ? entry.likedBy?.includes(participantId) : false;
              return (
                <li key={entry.id} className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-900">{entry.text}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs uppercase tracking-[0.2em] text-violet-600">
                      {entry.status === "accepted"
                        ? "Aceita"
                        : entry.status === "rejected"
                        ? "Recusada"
                        : "Pergunta Enviada"}
                    </span>
                    <button
                      onClick={() => void handleToggleLike(entry)}
                      disabled={likingQuestionId === entry.id}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${
                        hasLiked
                          ? "border-violet-400 bg-violet-100 text-violet-700"
                          : "border-violet-200 bg-white text-violet-600 hover:border-violet-300"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <span role="img" aria-label="curtir">
                        👍
                      </span>
                      <span>{highlightLikeLabel(entry)}</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}


      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl backdrop-blur sm:grid-cols-[180px_1fr]">
        <div className="flex flex-col items-center gap-3">
          <QRCode value={shareUrl} size={140} bgColor="transparent" fgColor="#4338ca" />
          <p className="text-xs text-slate-500">Compartilhe este QR Code com os participantes.</p>
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-600">Link direto: <span className="font-medium text-violet-600">{shareUrl}</span></p>
          <div className="flex flex-wrap gap-3">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-400"
            >
              Enviar via WhatsApp
            </a>
            <a
              href={telegramLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-sky-500 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-sky-400"
            >
              Compartilhar no Telegram
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

