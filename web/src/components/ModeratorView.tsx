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
import { addModeratorEmail, getRoom, removeModeratorEmail } from "@/lib/rooms";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

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
  const [addEmail, setAddEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [modFeedback, setModFeedback] = useState<string | null>(null);
  type ModerationLog = { id: string; type: "added" | "removed"; actorEmail: string; targetEmail: string; createdAt?: Date };
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const { user } = useAuth();
  const router = useRouter();
  const [historyLimit, setHistoryLimit] = useState(5);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoadingRoom(true);
      const fetched = await getRoom(roomId);
      if (!fetched) setError("Sala nao encontrada ou removida.");
      setRoom(fetched);
      setLoadingRoom(false);
    };
    void load();
  }, [roomId]);

  // Live room metadata (allowed emails, permissions, moderation history)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "rooms", roomId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setRoom({
        id: snap.id,
        title: (data.title as string) ?? "",
        organizationName: (data.organizationName as string) ?? "",
        organizationEmail: (data.organizationEmail as string) ?? "",
        moderatorName: (data.moderatorName as string | null) ?? undefined,
        moderatorEmail: (data.moderatorEmail as string | null) ?? undefined,
        allowedEmails: (data.allowedEmails as string[]) ?? [],
        createdAt: data.createdAt?.toDate?.(),
        status: (data.status as string | undefined) ?? undefined,
        allowModeratorManageModerators: (data.allowModeratorManageModerators as boolean | undefined) ?? true,
        allowModeratorDeleteRoom: (data.allowModeratorDeleteRoom as boolean | undefined) ?? true,
      });

      type RawModerationEvent = {
        type?: "added" | "removed";
        actorEmail?: string | null;
        targetEmail?: string | null;
        createdAt?: number | { toDate?: () => Date } | null;
      };
      const hist = (data.moderationHistory as RawModerationEvent[] | undefined) ?? [];
      const entries = hist
        .map((h, idx): ModerationLog => {
          const raw = h?.createdAt;
          let createdAt: Date | undefined;
          if (typeof raw === "number") createdAt = new Date(raw);
          else if (raw && typeof (raw as { toDate?: () => Date }).toDate === "function") {
            createdAt = (raw as { toDate: () => Date }).toDate();
          }
          return {
            id: String(idx),
            type: (h?.type as "added" | "removed") ?? "added",
            actorEmail: (h?.actorEmail ?? "") || "",
            targetEmail: (h?.targetEmail ?? "") || "",
            createdAt,
          };
        })
        .sort((a, b) => (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0))
        .slice(0, 30);
      setLogs(entries);
    });
    return () => unsub();
  }, [roomId]);

  // If user loses moderator permission, redirect to participação
  useEffect(() => {
    const email = user?.email?.toLowerCase();
    if (!email || !room) return;
    const isOwner = room.organizationEmail?.toLowerCase?.() === email;
    const isModerator = (room.allowedEmails ?? []).map((e) => e.toLowerCase()).includes(email);
    if (!isOwner && !isModerator) {
      router.replace(`/hall`);
    }
  }, [user?.email, room?.allowedEmails, room?.organizationEmail, roomId, router, room]);

  // Live questions
  useEffect(() => {
    const questionsRef = collection(db, "rooms", roomId, "questions");
    const q = query(questionsRef, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const entries: ModeratedQuestion[] = snapshot.docs.map((docu) => {
        const d = docu.data();
        return {
          id: docu.id,
          text: (d.text as string) ?? "",
          status: (d.status as "pending" | "accepted" | "rejected") ?? "pending",
          isAnonymous: Boolean(d.isAnonymous),
          participantName: (d.participantName as string | undefined) || undefined,
          createdAt: d.createdAt?.toDate?.(),
          highlighted: Boolean(d.highlighted),
          likeCount: typeof d.likeCount === "number" ? d.likeCount : undefined,
        };
      });
      setQuestions(entries);
    });
    return () => unsub();
  }, [roomId]);

  const filteredQuestions = useMemo(() => (filter === "all" ? questions : questions.filter((q) => q.status === filter)), [filter, questions]);
  const counts = useMemo(() => questions.reduce((acc, q) => ((acc.all++, acc[q.status]++), acc), { all: 0, pending: 0, accepted: 0, rejected: 0 } as Record<FilterOption | "all", number>), [questions]);

  const handleUpdateStatus = async (questionId: string, status: "pending" | "accepted" | "rejected") => {
    setProcessing(true);
    try {
      await updateDoc(doc(db, "rooms", roomId, "questions", questionId), { status, updatedAt: serverTimestamp() });
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleHighlight = async (q: ModeratedQuestion) => {
    setProcessing(true);
    try {
      await updateDoc(doc(db, "rooms", roomId, "questions", q.id), {
        highlighted: !q.highlighted,
        highlightedAt: !q.highlighted ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      });
    } finally {
      setProcessing(false);
    }
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleAddModerator = async () => {
    if (!room) return;
    const email = addEmail.trim().toLowerCase();
    setModFeedback(null);
    if (!isValidEmail(email)) {
      setModFeedback("Informe um e-mail válido.");
      return;
    }
    if (email === room.organizationEmail.toLowerCase()) {
      setModFeedback("Este e-mail já é o da organização.");
      return;
    }
    if (room.allowedEmails?.map((e) => e.toLowerCase()).includes(email)) {
      setModFeedback("Este e-mail já é moderador.");
      return;
    }
    setAdding(true);
    try {
      await addModeratorEmail(room.id, email, user?.email ?? undefined);
      setAddEmail("");
      setModFeedback("Moderador adicionado com sucesso.");
      setTimeout(() => setModFeedback(null), 2000);
    } catch (e) {
      const msg = (e as Error)?.message || "Não foi possível adicionar agora.";
      setModFeedback(msg);
    } finally {
      setAdding(false);
    }
  };

  const currentUserEmail = user?.email?.toLowerCase() ?? null;
  const isOwner = !!(currentUserEmail && room?.organizationEmail && room.organizationEmail.toLowerCase() === currentUserEmail);
  const canManageModerators = isOwner || room?.allowModeratorManageModerators !== false;

  const handleRemoveModerator = async (targetEmail: string) => {
    if (!room) return;
    if (!canManageModerators || !currentUserEmail) return;
    if (targetEmail.toLowerCase() === room.organizationEmail.toLowerCase()) return;
    try {
      setProcessing(true);
      await removeModeratorEmail(room.id, targetEmail, currentUserEmail);
      setModFeedback("Moderador removido.");
      setTimeout(() => setModFeedback(null), 2000);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkStatus = async (status: "accepted" | "rejected") => {
    const target = questions.filter((q) => q.status !== status);
    if (target.length === 0) return;
    setProcessing(true);
    try {
      const batch = writeBatch(db);
      target.forEach((q) => batch.update(doc(db, "rooms", roomId, "questions", q.id), { status, updatedAt: serverTimestamp() }));
      await batch.commit();
    } finally {
      setProcessing(false);
    }
  };

  const handleClear = async () => {
    setProcessing(true);
    try {
      const questionsRef = collection(db, "rooms", roomId, "questions");
      const snapshot = await getDocs(questionsRef);
      const batch = writeBatch(db);
      snapshot.forEach((d) => batch.delete(d.ref));
      await batch.commit();
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
            <p className="text-sm text-slate-600">Organizacao {room.organizationName} - {counts.pending} perguntas pendentes</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/hall" aria-label="Voltar ao hall" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-violet-200 hover:text-violet-600" title="Voltar ao hall">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <button onClick={() => void handleBulkStatus("accepted")} disabled={processing || counts.pending === 0} className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60">Aprovar todas</button>
            <button onClick={() => void handleBulkStatus("rejected")} disabled={processing || counts.pending === 0} className="inline-flex items-center justify-center rounded-full bg-rose-500 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-rose-500/20 transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60">Rejeitar todas</button>
            <button onClick={handleClear} disabled={processing || counts.all === 0} className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:border-violet-200 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-60">Limpar historico</button>
          </div>
        </header>

        <section className="flex flex-wrap gap-2">
          {(Object.keys(filterLabels) as FilterOption[]).map((option) => (
            <button key={option} onClick={() => setFilter(option)} className={`rounded-full border px-4 py-2 text-xs font-medium transition ${filter === option ? "border-violet-200 bg-violet-50 text-violet-600" : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-600"}`}>
              {filterLabels[option]} ({counts[option] ?? 0})
            </button>
          ))}
        </section>

        <section className="grid gap-4 pb-16">
          {filteredQuestions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-8 text-sm text-slate-500">Nenhuma pergunta nesta categoria por enquanto.</div>
          ) : (
            filteredQuestions.map((question) => (
              <article key={question.id} className={`flex flex-col gap-4 rounded-3xl border p-6 shadow-lg backdrop-blur ${question.highlighted ? "border-violet-200 bg-violet-50/80" : "border-slate-200 bg-white/90"}`}>
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-slate-900">{question.text}</p>
                  <p className="text-xs text-slate-500">{question.isAnonymous ? "Anonimo" : question.participantName || "Participante"}{question.createdAt && ` - ${question.createdAt.toLocaleTimeString()}`}</p>
                  {question.likeCount !== undefined && question.likeCount > 0 && (
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-medium text-violet-600">Destaque com {question.likeCount} {question.likeCount === 1 ? "curtida" : "curtidas"}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${question.status === "accepted" ? "border-emerald-200 bg-emerald-50 text-emerald-600" : question.status === "rejected" ? "border-rose-200 bg-rose-50 text-rose-600" : "border-slate-200 bg-slate-50 text-slate-500"}`}>{question.status === "accepted" ? "Aceita" : question.status === "rejected" ? "Recusada" : "Pendente"}</span>
                  <button onClick={() => void handleUpdateStatus(question.id, "accepted")} disabled={processing || question.status === "accepted"} className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50">Aprovar</button>
                  <button onClick={() => void handleUpdateStatus(question.id, "rejected")} disabled={processing || question.status === "rejected"} className="inline-flex items-center justify-center rounded-full bg-rose-500 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-rose-500/20 transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50">Rejeitar</button>
                  {question.status !== "pending" && (
                    <button onClick={() => void handleUpdateStatus(question.id, "pending")} disabled={processing} className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:border-violet-200 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-50">Voltar para pendente</button>
                  )}
                  <button onClick={() => void handleToggleHighlight(question)} disabled={processing} className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-medium transition ${question.highlighted ? "border border-violet-300 bg-white text-violet-600 hover:border-violet-400" : "bg-violet-600 text-white shadow-lg shadow-violet-600/20 hover:bg-violet-500"} disabled:cursor-not-allowed disabled:opacity-60`}>{question.highlighted ? "Remover destaque" : "Destacar"}</button>
                </div>
              </article>
            ))
          )}
        </section>

        {room && (
          <section className="mb-6 grid gap-6 sm:grid-cols-2">
            <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white/90 p-4 self-start">
              <h3 className="text-sm font-semibold text-slate-900">Moderadores</h3>
              <div className="flex flex-wrap gap-2">
                {room.allowedEmails
                  ?.filter((e) => e.toLowerCase() !== room.organizationEmail.toLowerCase())
                  .map((email) => (
                    <span key={email} className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                      {email}
                      {canManageModerators && (
                        <button onClick={() => handleRemoveModerator(email)} disabled={processing} className="rounded-full border border-violet-200 bg-white/80 px-2 py-0.5 text-[10px] text-violet-700 transition hover:border-violet-300 hover:text-violet-900" title="Remover moderador">
                          remover
                        </button>
                      )}
                    </span>
                  ))}
                {room.allowedEmails?.filter((e) => e.toLowerCase() !== room.organizationEmail.toLowerCase()).length === 0 && (
                  <span className="text-xs text-slate-500">Nenhum moderador adicionado ainda.</span>
                )}
              </div>
              {canManageModerators && (
                <div className="flex flex-wrap gap-2">
                  <input type="email" placeholder="email-do-moderador@exemplo.com" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} className="min-w-[240px] flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
                  <button onClick={handleAddModerator} disabled={adding} className="inline-flex items-center justify-center rounded-full bg-violet-600 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60">Adicionar moderador</button>
                </div>
              )}
              {modFeedback && <div className="text-xs text-slate-600">{modFeedback}</div>}

              {isOwner && (
                <>
                  <hr className="my-3 border-slate-200" />
                  <h4 className="text-sm font-semibold text-slate-900">Permissões</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <span>Permitir que moderadores gerenciem moderadores</span>
                      <input type="checkbox" checked={room.allowModeratorManageModerators !== false} onChange={async (e) => {
                        try {
                          await updateDoc(doc(db, "rooms", roomId), { allowModeratorManageModerators: e.target.checked, updatedAt: serverTimestamp() });
                        } catch (err) {
                          console.error(err);
                        }
                      }} className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                    </label>
                    <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <span>Permitir que moderadores excluam a sala</span>
                      <input type="checkbox" checked={room.allowModeratorDeleteRoom !== false} onChange={async (e) => {
                        try {
                          await updateDoc(doc(db, "rooms", roomId), { allowModeratorDeleteRoom: e.target.checked, updatedAt: serverTimestamp() });
                        } catch (err) {
                          console.error(err);
                        }
                      }} className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                    </label>
                  </div>
                </>
              )}
            </div>

            <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white/90 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Histórico</h3>
                {isOwner && logs.length > 0 && (
                  <button
                    onClick={async () => {
                      try {
                        await updateDoc(doc(db, "rooms", roomId), { moderationHistory: [], updatedAt: serverTimestamp() });
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-rose-200 hover:text-rose-500"
                  >
                    Limpar histórico
                  </button>
                )}
              </div>
              {logs.length === 0 ? (
                <p className="mt-0 text-xs text-slate-500">Sem eventos recentes.</p>
              ) : (
                <>
                <ul className="grid gap-2">
                  {logs.slice(0, historyLimit).map((l) => (
                    <li key={l.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                      <span>
                        <b>{l.actorEmail || "Alguém"}</b> {l.type === "added" ? "adicionou" : "removeu"} <b>{l.targetEmail}</b>
                      </span>
                      <span className="text-[10px] text-slate-500">{l.createdAt ? l.createdAt.toLocaleString() : ""}</span>
                    </li>
                  ))}
                </ul>
                {logs.length > historyLimit && (
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => setHistoryLimit((n) => n + 5)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-violet-200 hover:text-violet-600"
                    >
                      Carregar mais
                    </button>
                  </div>
                )}
                </>
              )}
            </div>
          </section>
        )}
      </div>
    </ProtectedRoute>
  );
};


