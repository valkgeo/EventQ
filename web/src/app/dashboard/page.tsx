"use client";

import QRCode from "react-qr-code";
import Link from "next/link";
import { useEffect, useState } from "react";
import { onSnapshot, orderBy, query } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { deleteRoomWithQuestions, getRoom, roomsByEmailQuery, type Room, roomsCollection } from "@/lib/rooms";
import { useAuth } from "@/context/AuthContext";
import { SignOutButton } from "@/components/SignOutButton";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const JOINED_ROOMS_KEY = "eventq-joined-rooms";

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
  const [rooms, setRooms] = useState<Room[]>([]);
  const [participantRooms, setParticipantRooms] = useState<Room[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [removingRoomId, setRemovingRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user?.email) {
      router.replace("/login?redirect=/dashboard");
      return;
    }

    const email = user.email.toLowerCase();
    const queryRef = roomsByEmailQuery(email);
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
      setRooms(entries);
    });

    return () => unsubscribe();
  }, [loading, router, user?.email]);

  useEffect(() => {
    const loadParticipantRooms = async () => {
      const joined = readJoinedRooms();
      if (joined.length === 0) {
        setParticipantRooms([]);
        return;
      }

      try {
        const fetched = await Promise.all(
          joined.map(async (roomId) => {
            const room = await getRoom(roomId);
            return room ? room : null;
          })
        );
        setParticipantRooms(fetched.filter(Boolean) as Room[]);
      } catch (error) {
        console.error(error);
      }
    };

    void loadParticipantRooms();
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

  const handleCopy = async (roomId: string) => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/rooms/${roomId}/participate`;
    await navigator.clipboard.writeText(url);
    setFeedback("Link copiado para a area de transferencia.");
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleDeleteRoom = async (room: Room) => {
    const confirmation = window.confirm(
      `Deseja excluir a sala "${room.title}" e todo o historico de perguntas?`
    );
    if (!confirmation) return;

    setRemovingRoomId(room.id);
    try {
      await deleteRoomWithQuestions(room.id);
      setFeedback("Sala removida com sucesso.");
    } catch (error) {
      console.error(error);
      setFeedback("Nao foi possivel excluir a sala agora.");
    } finally {
      setRemovingRoomId(null);
    }
  };

  const handleRemoveParticipantRoom = (roomId: string) => {
    const rooms = readJoinedRooms().filter((id) => id !== roomId);
    writeJoinedRooms(rooms);
    setParticipantRooms((current) => current.filter((room) => room.id !== roomId));
  };

  const email = user?.email?.toLowerCase() ?? null;

  const isOwner = (room: Room) => email && room.organizationEmail.toLowerCase() === email;

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
              Gerencie suas salas, compartilhe acessos e acompanhe as salas que voce participa.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <SignOutButton />
          </div>
        </header>

        {feedback && (
          <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-600 shadow-sm">
            {feedback}
          </div>
        )}

        <section className="grid gap-6 pb-16 sm:grid-cols-2">
          {participantRooms.length > 0 && (
            <div className="sm:col-span-2">
              <h2 className="mb-4 text-xl font-semibold text-slate-900">Salas que acompanho</h2>
            </div>
          )}
          {participantRooms.length === 0 ? null : participantRooms.map((room) => {
            const origin = typeof window !== "undefined" ? window.location.origin : "";
            const roomUrl = `${origin}/rooms/${room.id}/participate`;
            const { whatsapp, telegram } = shareLinks(roomUrl, room.title);
            return (
              <article
                key={room.id}
                className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl backdrop-blur"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">{room.title}</h3>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">ID {room.id}</p>
                    <p className="text-sm text-slate-500">Organizacao: {room.organizationName}</p>
                  </div>
                  <div className="rounded-2xl border border-violet-100 bg-violet-50 p-3">
                    <QRCode value={roomUrl} size={96} bgColor="transparent" fgColor="#4338ca" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/rooms/${room.id}/participate`}
                    className="inline-flex items-center justify-center rounded-full bg-violet-600 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500"
                  >
                    Entrar na sala
                  </Link>
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-400"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={telegram}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-full bg-sky-500 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-sky-400"
                  >
                    Telegram
                  </a>
                  <button
                    onClick={() => void handleCopy(room.id)}
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:border-violet-200 hover:text-violet-600"
                  >
                    Copiar link
                  </button>
                  <button
                    onClick={() => handleRemoveParticipantRoom(room.id)}
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-500 transition hover:border-rose-200 hover:text-rose-500"
                  >
                    Remover da minha lista
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        <section className="grid gap-6 pb-16 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">Salas que organizo/modero</h2>
          </div>
          {rooms.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-8 text-sm text-slate-500 shadow-sm">
              Nenhuma sala cadastrada ainda.
            </div>
          ) : (
            rooms.map((room) => {
              const origin = typeof window !== "undefined" ? window.location.origin : "";
              const participantLink = `${origin}/rooms/${room.id}/participate`;
              const { whatsapp, telegram } = shareLinks(participantLink, room.title);
              return (
                <article
                  key={room.id}
                  className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl backdrop-blur"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-2">
                      <h3 className="text-lg font-semibold text-slate-900">{room.title}</h3>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">ID {room.id}</p>
                      {room.moderatorEmail && (
                        <p className="text-sm text-slate-500">
                          Moderador: {room.moderatorName || "Convidado"} ({room.moderatorEmail})
                        </p>
                      )}
                    </div>
                    <div className="rounded-2xl border border-violet-100 bg-violet-50 p-3">
                      <QRCode value={participantLink} size={96} bgColor="transparent" fgColor="#4338ca" />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => void handleCopy(room.id)}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:border-violet-200 hover:text-violet-600"
                    >
                      Copiar link
                    </button>
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-400"
                    >
                      WhatsApp
                    </a>
                    <a
                      href={telegram}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-full bg-sky-500 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-sky-400"
                    >
                      Telegram
                    </a>
                    <Link
                      href={`/rooms/${room.id}/participate`}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:border-violet-200 hover:text-violet-600"
                    >
                      Abrir participacao
                    </Link>
                    <Link
                      href={`/rooms/${room.id}/moderate`}
                      className="inline-flex items-center justify-center rounded-full bg-violet-600 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500"
                    >
                      Acessar moderacao
                    </Link>
                    {isOwner(room) && (
                      <button
                        onClick={() => void handleDeleteRoom(room)}
                        disabled={removingRoomId === room.id}
                        className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-600 shadow-sm transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {removingRoomId === room.id ? "Excluindo..." : "Excluir sala"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </ProtectedRoute>
  );
}

