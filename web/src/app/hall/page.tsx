"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onSnapshot, orderBy, query } from "firebase/firestore";
import { roomsCollection, type Room } from "@/lib/rooms";
import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SignOutButton } from "@/components/SignOutButton";

const hasModerationAccess = (room: Room, email: string | null | undefined) => {
  if (!email) return false;
  return room.allowedEmails.some((allowed) => allowed.toLowerCase() === email.toLowerCase());
};

export default function HallPage() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    const hallQuery = query(roomsCollection, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(hallQuery, (snapshot) => {
      const entries = snapshot.docs.map((document) => {
        const data = document.data();
        return {
          id: document.id,
          title: (data.title as string) ?? "Sala sem titulo",
          organizationName: (data.organizationName as string) ?? "",
          organizationEmail: (data.organizationEmail as string) ?? "",
          moderatorName: (data.moderatorName as string | null) ?? undefined,
          moderatorEmail: (data.moderatorEmail as string | null) ?? undefined,
          allowedEmails: (data.allowedEmails as string[]) ?? [],
          createdAt: data.createdAt?.toDate?.(),
          status: (data.status as string | undefined) ?? undefined,
        } satisfies Room;
      });
      setRooms(entries);
    });

    return () => unsubscribe();
  }, []);

  const email = user?.email ?? null;
  const moderatableRoomIds = useMemo(() => {
    return rooms
      .filter((room) => hasModerationAccess(room, email))
      .map((room) => room.id);
  }, [rooms, email]);

  return (
    <ProtectedRoute>
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Hall do evento</p>
            <h1 className="text-3xl font-semibold text-slate-900">Escolha uma sala</h1>
            <p className="text-sm text-slate-600">
              Veja todas as salas disponiveis. Se voce for moderador ou organizador, podera acessar a moderacao diretamente.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-violet-200 hover:text-violet-600"
            >
              Ir para dashboard
            </Link>
            <SignOutButton />
          </div>
        </header>

        <section className="grid gap-6 pb-16 sm:grid-cols-2">
          {rooms.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-8 text-sm text-slate-500 shadow-sm">
              Nenhuma sala cadastrada ainda. Crie a primeira no dashboard.
            </div>
          ) : (
            rooms.map((room) => {
              const canModerate = moderatableRoomIds.includes(room.id);
              return (
                <article
                  key={room.id}
                  className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl backdrop-blur"
                >
                  <div className="flex flex-col gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">{room.title}</h2>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">ID {room.id}</p>
                    <p className="text-sm text-slate-500">Organizacao: {room.organizationName}</p>
                    {room.moderatorEmail && (
                      <p className="text-sm text-slate-500">
                        Moderador: {room.moderatorName || "Convidado"} ({room.moderatorEmail})
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/rooms/${room.id}/participate`}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:border-violet-200 hover:text-violet-600"
                    >
                      Abrir participacao
                    </Link>
                    {canModerate && (
                      <Link
                        href={`/rooms/${room.id}/moderate`}
                        className="inline-flex items-center justify-center rounded-full bg-violet-600 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500"
                      >
                        Acessar moderacao
                      </Link>
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
