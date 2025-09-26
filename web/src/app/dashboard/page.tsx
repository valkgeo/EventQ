"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { createRoom, roomsByEmailQuery, type Room } from "@/lib/rooms";
import { useAuth } from "@/context/AuthContext";
import { SignOutButton } from "@/components/SignOutButton";
import { db } from "@/lib/firebase";

interface RoomFormState {
  title: string;
  moderatorName: string;
  moderatorEmail: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [form, setForm] = useState<RoomFormState>({
    title: "",
    moderatorName: "",
    moderatorEmail: "",
  });
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<Record<string, "idle" | "copied">>({});
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user?.email) {
      router.replace("/login?redirect=/dashboard");
      return;
    }

    const email = user.email.toLowerCase();
    const query = roomsByEmailQuery(email);
    const unsubscribe = onSnapshot(query, (snapshot) => {
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
    const fetchProfile = async () => {
      if (!user) return;
      const profileRef = doc(db, "users", user.uid);
      const snapshot = await getDoc(profileRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as { organizationName?: string };
        if (data.organizationName) {
          setOrganizationName(data.organizationName);
        }
      }
    };

    void fetchProfile();
  }, [user]);

  const handleCreateRoom = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.email) return;

    setCreating(true);
    setFeedback(null);

    try {
      const roomId = await createRoom({
        title: form.title,
        organizationName: organizationName || user.displayName || "Organizacao",
        organizationEmail: user.email,
        moderatorName: form.moderatorName || undefined,
        moderatorEmail: form.moderatorEmail || undefined,
        createdBy: user.uid,
      });

      setForm({ title: "", moderatorName: "", moderatorEmail: "" });
      setFormOpen(false);
      setFeedback("Sala criada com sucesso.");
      router.push(`/rooms/${roomId}/moderate`);
    } catch (error) {
      console.error(error);
      setFeedback("Nao foi possivel criar a sala agora.");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (roomId: string) => {
    if (!origin) return;
    const shareLink = `${origin}/rooms/${roomId}/participate`;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopyState((state) => ({ ...state, [roomId]: "copied" }));
      setTimeout(() => setCopyState((state) => ({ ...state, [roomId]: "idle" })), 2000);
    } catch (error) {
      console.error(error);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-center text-slate-200">
        <p className="text-sm">Carregando painel...</p>
      </div>
    );
  }

  const handleOpenForm = () => {
    setFeedback(null);
    setFormOpen(true);
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            {organizationName || user.displayName || "Sua organizacao"}
          </p>
          <h1 className="text-3xl font-semibold text-slate-100">Salas e moderacao</h1>
          <p className="text-sm text-slate-400">
            Crie novas salas, distribua QR Codes e acompanhe perguntas aprovando, rejeitando ou limpando filas.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={handleOpenForm}
            className="inline-flex items-center justify-center rounded-full bg-slate-100 px-5 py-2 text-sm font-medium text-slate-900 transition hover:bg-white"
          >
            Nova sala
          </button>
          <SignOutButton />
        </div>
      </header>

      {feedback && (
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/40 p-4 text-sm text-slate-300">
          {feedback}
        </div>
      )}

      {formOpen && (
        <form
          onSubmit={handleCreateRoom}
          className="grid gap-4 rounded-3xl border border-slate-800/80 bg-slate-900/40 p-8 shadow-xl backdrop-blur"
        >
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Nome da sala</label>
            <input
              required
              value={form.title}
              onChange={(event) => setForm((state) => ({ ...state, title: event.target.value }))}
              placeholder="Painel principal do evento"
              className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-slate-500"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Nome do moderador</label>
            <input
              value={form.moderatorName}
              onChange={(event) => setForm((state) => ({ ...state, moderatorName: event.target.value }))}
              placeholder="Moderador convidado"
              className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-slate-500"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">E-mail do moderador</label>
            <input
              type="email"
              value={form.moderatorEmail}
              onChange={(event) => setForm((state) => ({ ...state, moderatorEmail: event.target.value }))}
              placeholder="moderador@evento.com"
              className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-slate-500"
            />
            <p className="text-xs text-slate-500">Opcional. Adicione para conceder acesso direto a moderacao.</p>
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="text-sm text-slate-400 underline underline-offset-4 transition hover:text-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center justify-center rounded-full bg-slate-100 px-5 py-2 text-sm font-medium text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Criando..." : "Criar sala"}
            </button>
          </div>
        </form>
      )}

      <section className="grid gap-6 pb-16 sm:grid-cols-2">
        {rooms.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-700/60 bg-slate-900/30 p-8 text-sm text-slate-400">
            Nenhuma sala criada ainda. Que tal inaugurar a primeira?
          </div>
        ) : (
          rooms.map((room) => {
            const participantLink = origin ? `${origin}/rooms/${room.id}/participate` : `/rooms/${room.id}/participate`;
            const moderateLink = `/rooms/${room.id}/moderate`;
            const shareState = copyState[room.id] ?? "idle";

            return (
              <article
                key={room.id}
                className="flex flex-col gap-6 rounded-3xl border border-slate-800/80 bg-slate-900/40 p-6 shadow-xl backdrop-blur"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-lg font-semibold text-slate-100">{room.title}</h2>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">ID {room.id}</p>
                    {room.moderatorEmail && (
                      <p className="text-xs text-slate-500">
                        Moderador: {room.moderatorName || "Convidado"} ({room.moderatorEmail})
                      </p>
                    )}
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                    <QRCode value={participantLink} size={96} bgColor="transparent" fgColor="#e2e8f0" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleCopy(room.id)}
                    className="inline-flex items-center justify-center rounded-full border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-400 hover:text-white"
                  >
                    {shareState === "copied" ? "Link copiado" : "Copiar link"}
                  </button>
                  <Link
                    href={participantLink}
                    className="inline-flex items-center justify-center rounded-full border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-400 hover:text-white"
                  >
                    Abrir pagina do participante
                  </Link>
                  <Link
                    href={moderateLink}
                    className="inline-flex items-center justify-center rounded-full bg-slate-100 px-4 py-2 text-xs font-medium text-slate-900 transition hover:bg-white"
                  >
                    Acessar moderacao
                  </Link>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
