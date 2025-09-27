"use client";

import QRCode from "react-qr-code";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, getDoc, onSnapshot, orderBy, query } from "firebase/firestore";
import { useRouter } from "next/navigation";
import {
  createRoom,
  deleteRoomWithQuestions,
  getRoom,
  roomsByEmailQuery,
  type Room,
  roomsCollection,
} from "@/lib/rooms";
import { useAuth } from "@/context/AuthContext";
import { SignOutButton } from "@/components/SignOutButton";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { db } from "@/lib/firebase";

type RoomStats = {
  total: number;
  accepted: number;
  pending: number;
};

type CreateFormState = {
  title: string;
  moderatorName: string;
  moderatorEmail: string;
};

const JOINED_ROOMS_KEY = "eventq-joined-rooms";
const initialForm: CreateFormState = {
  title: "",
  moderatorName: "",
  moderatorEmail: "",
};

const readJoinedRooms = () => {
  if (typeof window === "undefined") return [] as string[];
  try {
    const stored = window.localStorage.getItem(JOINED_ROOMS_KEY);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

const writeJoinedRooms = (rooms: string[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(JOINED_ROOMS_KEY, JSON.stringify(rooms));
};

const shareLinks = (roomUrl: string, roomTitle: string) => ({
  whatsapp: `https://wa.me/?text=${encodeURIComponent(`Participe da sala ${roomTitle}: ${roomUrl}`)}`,
  telegram: `https://t.me/share/url?url=${encodeURIComponent(roomUrl)}&text=${encodeURIComponent(`Participe da sala ${roomTitle}`)}`,
});

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [managedRooms, setManagedRooms] = useState<Room[]>([]);
  const [participantRooms, setParticipantRooms] = useState<Room[]>([]);
  const [roomStats, setRoomStats] = useState<Record<string, RoomStats>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [removingRoomId, setRemovingRoomId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateFormState>(initialForm);
  const [organizationName, setOrganizationName] = useState<string>("");
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [shareOpenId, setShareOpenId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const email = user?.email?.toLowerCase() ?? null;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    if (!user) return;
    const profileRef = doc(db, "users", user.uid);
    getDoc(profileRef)
      .then((snapshot) => {
        if (!snapshot.exists()) {
          if (user.displayName) {
            setOrganizationName((current) => current || (user.displayName ?? ""));
          }
          return;
        }

        const data = snapshot.data() as { organizationName?: string; displayName?: string };
        if (data.organizationName) {
          setOrganizationName(data.organizationName);
        } else if (user.displayName) {
          setOrganizationName(user.displayName ?? "");
        }

      })
      .catch((err) => console.error(err));
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (!user?.email) {
      router.replace("/login?redirect=/dashboard");
      return;
    }

    const emailLower = user.email.toLowerCase();
    const queryRef = roomsByEmailQuery(emailLower);
    const unsubscribe = onSnapshot(queryRef, (snapshot) => {
      const entries: Room[] = snapshot.docs.map((document) => {
        const data = document.data();
        return {
          id: document.id,
          title: data.title as string,
          organizationName: data.organizationName as string,
          organizationEmail: data.organizationEmail as string,
          moderatorName: (data.moderatorName as string | null) ?? undefined,
          moderatorEmail: (data.moderatorEmail as string | null) ?? undefined,
          allowedEmails: (data.allowedEmails as string[]) ?? [],
          createdAt: data.createdAt?.toDate?.(),
          status: data.status as string | undefined,
        };
      });
      setManagedRooms(entries);
    });

    return () => unsubscribe();
  }, [loading, router, user?.email]);

  useEffect(() => {
    const joined = readJoinedRooms();
    if (joined.length === 0) {
      setParticipantRooms([]);
      return;
    }

    const load = async () => {
      const fetched = await Promise.all(
        joined.map(async (roomId) => {
          const room = await getRoom(roomId);
          return room ? room : null;
        })
      );
      setParticipantRooms(fetched.filter(Boolean) as Room[]);
    };

    void load();
  }, []);

  useEffect(() => {
    const hallQuery = query(roomsCollection, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(hallQuery, () => {
      const joined = readJoinedRooms();
      if (joined.length === 0) return;
      const load = async () => {
        const fetched = await Promise.all(
          joined.map(async (roomId) => {
            const room = await getRoom(roomId);
            return room ? room : null;
          })
        );
        setParticipantRooms(fetched.filter(Boolean) as Room[]);
      };
      void load();
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribeFns: (() => void)[] = [];

    managedRooms.forEach((room) => {
      const questionsRef = collection(db, "rooms", room.id, "questions");
      const unsubscribe = onSnapshot(questionsRef, (snapshot) => {
        let total = 0;
        let accepted = 0;
        let pending = 0;
        snapshot.forEach((doc) => {
          total += 1;
          const status = doc.data().status as string | undefined;
          if (status === "accepted") accepted += 1;
          else if (status === "pending" || !status) pending += 1;
        });
        setRoomStats((prev) => ({
          ...prev,
          [room.id]: { total, accepted, pending },
        }));
      });
      unsubscribeFns.push(unsubscribe);
    });

    return () => {
      unsubscribeFns.forEach((fn) => fn());
    };
  }, [managedRooms]);

  const displayRooms = useMemo(() => {
    const map = new Map<string, { room: Room; isModerator: boolean; isOwner: boolean }>();

    managedRooms.forEach((room) => {
      const isOwner = email ? room.organizationEmail.toLowerCase() === email : false;
      map.set(room.id, {
        room,
        isModerator: true,
        isOwner,
      });
    });

    participantRooms.forEach((room) => {
      if (map.has(room.id)) return;
      map.set(room.id, {
        room,
        isModerator: false,
        isOwner: false,
      });
    });

    return Array.from(map.values());
  }, [managedRooms, participantRooms, email]);

  const hasRooms = displayRooms.length > 0;

  useEffect(() => {
    if (hasRooms) {
      setShowCreateForm(true);
    }
  }, [hasRooms]);

  const handleCopy = async (roomId: string) => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/rooms/${roomId}/participate`;
    await navigator.clipboard.writeText(url);
    setFeedback("Link copiado para a área de transferência.");
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleDeleteRoom = async (room: Room) => {
    const confirmation = window.confirm(
      `Deseja excluir a sala "${room.title}" e todo o histórico de perguntas?`
    );
    if (!confirmation) return;

    setRemovingRoomId(room.id);
    try {
      await deleteRoomWithQuestions(room.id);
      setFeedback("Sala removida com sucesso.");
    } catch (error) {
      console.error(error);
      setFeedback("Não foi possível excluir a sala agora.");
    } finally {
      setRemovingRoomId(null);
    }
  };

  const handleRemoveParticipantRoom = (roomId: string) => {
    const rooms = readJoinedRooms().filter((id) => id !== roomId);
    writeJoinedRooms(rooms);
    setParticipantRooms((current) => current.filter((room) => room.id !== roomId));
  };

  const handleCreateRoom = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.email) return;

    setCreatingRoom(true);
    setFeedback(null);

    try {
      const roomId = await createRoom({
        title: form.title,
        organizationName: organizationName || user.displayName || "Minha organização",
        organizationEmail: user.email,
        moderatorName: form.moderatorName || undefined,
        moderatorEmail: form.moderatorEmail || undefined,
        createdBy: user.uid,
      });

      writeJoinedRooms([roomId, ...readJoinedRooms()]);
      setForm(initialForm);
      setFeedback("Sala criada com sucesso!");
      router.push(`/rooms/${roomId}/moderate`);
    } catch (error) {
      console.error(error);
      setFeedback("Não foi possível criar a sala agora.");
    } finally {
      setCreatingRoom(false);
    }
  };

  const renderShareButton = (roomId: string, title: string) => {
    const url = `${origin}/rooms/${roomId}/participate`;
    const { whatsapp, telegram } = shareLinks(url, title);
    const isOpen = shareOpenId === roomId;

    return (
      <div className="relative">
        <button
          onClick={() => setShareOpenId((current) => (current === roomId ? null : roomId))}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:border-violet-200 hover:text-violet-600"
        >
          Compartilhar
        </button>
        {isOpen && (
          <div className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <button
              onClick={() => {
                void handleCopy(roomId);
                setShareOpenId(null);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50"
            >
              Copiar link
            </button>
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-emerald-600 transition hover:bg-slate-50"
              onClick={() => setShareOpenId(null)}
            >
              WhatsApp
            </a>
            <a
              href={telegram}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-sky-600 transition hover:bg-slate-50"
              onClick={() => setShareOpenId(null)}
            >
              Telegram
            </a>
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (displayRooms.length > 0) {
      setShowCreateForm(true);
    }
  }, [displayRooms.length]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white/70 px-6 text-center text-slate-500">
        <p className="text-sm">Carregando painel...</p>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Salas do EventQ</p>
            <h1 className="text-3xl font-semibold text-slate-900">Painel e Hall</h1>
            <p className="text-sm text-slate-600">
              Gerencie, compartilhe e acompanhe as salas do seu evento.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {displayRooms.length > 0 && (
              <button
                onClick={() => setShowCreateForm((current) => !current)}
                className="inline-flex items-center justify-center rounded-full bg-violet-600 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500"
              >
                {showCreateForm ? "Fechar criação" : "Criar sala"}
              </button>
            )}
            <SignOutButton />
          </div>
        </header>

        {feedback && (
          <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-600 shadow-sm">
            {feedback}
          </div>
        )}

        {displayRooms.length === 0 && !showCreateForm && (
          <section className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/80 px-10 py-16 text-center shadow-xl backdrop-blur">
            <h2 className="text-2xl font-semibold text-slate-900">Nenhum evento criado ainda</h2>
            <p className="mt-2 text-sm text-slate-600">
              Comece criando seu primeiro evento para receber perguntas dos participantes.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-violet-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500"
            >
              Criar primeiro evento
            </button>
          </section>
        )}

        {showCreateForm && (
          <section className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl backdrop-blur">
            <h2 className="text-lg font-semibold text-slate-900">Crie uma sala</h2>
            <p className="mt-1 text-sm text-slate-500">
              Informe os dados principais para gerar um novo QR Code e convidar moderadores.
            </p>
            <form onSubmit={handleCreateRoom} className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Nome da sala</label>
                <input
                  required
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Ex.: Sala principal do evento"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Moderador principal</label>
                <input
                  value={form.moderatorName}
                  onChange={(event) => setForm((prev) => ({ ...prev, moderatorName: event.target.value }))}
                  placeholder="Nome completo"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">E-mail do moderador</label>
                <input
                  type="email"
                  value={form.moderatorEmail}
                  onChange={(event) => setForm((prev) => ({ ...prev, moderatorEmail: event.target.value }))}
                  placeholder="moderador@evento.com"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
                <p className="text-xs text-slate-500">Opcional. Adicione para conceder acesso direto à moderação.</p>
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={creatingRoom}
                  className="inline-flex items-center justify-center rounded-full bg-violet-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingRoom ? "Criando..." : "Criar sala"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="grid gap-6 pb-16 sm:grid-cols-2">
          {displayRooms.map(({ room, isModerator, isOwner }) => {
            const roomUrl = `${origin}/rooms/${room.id}/participate`;
            const stats = roomStats[room.id] ?? { total: 0, accepted: 0, pending: 0 };
            return (
              <article
                key={room.id}
                className="relative rounded-3xl border border-slate-200 bg-white/90 shadow-xl backdrop-blur"
              >
                <div className="bg-gradient-to-r from-violet-500 to-indigo-500 px-6 py-5 text-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{room.title}</h3>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/70">{room.organizationName}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                      isModerator ? "bg-emerald-400 text-emerald-900" : "bg-white/20 text-white"
                    }`}>
                      {isModerator ? "Moderador" : "Participante"}
                    </span>
                  </div>
                </div>
                <div className="px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-2">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Código</p>
                      <div className="inline-flex items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">{room.id}</span>
                        <button
                          onClick={() => void handleCopy(room.id)}
                          className="text-xs text-violet-600 underline underline-offset-4 transition hover:text-violet-500"
                        >
                          Copiar
                        </button>
                      </div>
                      {room.createdAt && (
                        <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                          <span className="text-slate-400">Criado em</span>
                          {room.createdAt.toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                    <div className="rounded-2xl border border-violet-100 bg-violet-50 p-3">
                      <QRCode value={roomUrl} size={88} bgColor="transparent" fgColor="#4338ca" />
                    </div>
                  </div>

                  {isModerator && (
                    <div className="mt-6 grid grid-cols-3 items-center gap-4 border-t border-slate-200 pt-4">
                      <div className="text-center">
                        <p className="text-lg font-semibold text-slate-900">{stats.total}</p>
                        <p className="text-xs text-slate-500">Total</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-emerald-600">{stats.accepted}</p>
                        <p className="text-xs text-slate-500">Aprovadas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-amber-500">{stats.pending}</p>
                        <p className="text-xs text-slate-500">Pendentes</p>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap gap-3">
                    {renderShareButton(room.id, room.title)}
                    <Link
                      href={`/rooms/${room.id}/participate`}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:border-violet-200 hover:text-violet-600"
                    >
                      Ver sala
                    </Link>
                    {isModerator ? (
                      <Link
                        href={`/rooms/${room.id}/moderate`}
                        className="inline-flex items-center justify-center rounded-full bg-violet-600 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500"
                      >
                        Moderar
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleRemoveParticipantRoom(room.id)}
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-500 transition hover:border-rose-200 hover:text-rose-500"
                      >
                        Remover da lista
                      </button>
                    )}
                    {isOwner && (
                      <button
                        onClick={() => void handleDeleteRoom(room)}
                        disabled={removingRoomId === room.id}
                        className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-600 shadow-sm transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {removingRoomId === room.id ? "Excluindo..." : "Excluir"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </ProtectedRoute>
  );
}




