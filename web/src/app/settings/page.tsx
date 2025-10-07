"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Link from "next/link";

type Profile = {
  displayName?: string;
  organizationName?: string;
  email?: string;
  acceptModeratorInvites?: boolean; // default true
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile>({ acceptModeratorInvites: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as Profile;
          setProfile({
            displayName: data.displayName ?? user.displayName ?? "",
            organizationName: data.organizationName ?? "",
            email: data.email ?? user.email ?? "",
            acceptModeratorInvites: data.acceptModeratorInvites ?? true,
          });
        } else {
          setProfile({
            displayName: user.displayName ?? "",
            organizationName: "",
            email: user.email ?? "",
            acceptModeratorInvites: true,
          });
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user]);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setFeedback(null);
    try {
      const ref = doc(db, "users", user.uid);
      await setDoc(
        ref,
        {
          displayName: profile.displayName ?? "",
          organizationName: profile.organizationName ?? "",
          email: profile.email ?? user.email ?? "",
          acceptModeratorInvites: profile.acceptModeratorInvites ?? true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setFeedback("Dados atualizados com sucesso.");
      setTimeout(() => setFeedback(null), 2500);
    } catch (e) {
      console.error(e);
      setFeedback("Não foi possível salvar agora.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-10">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Configurações</h1>
            <p className="text-sm text-slate-500">Atualize seu perfil e preferências.</p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:border-violet-200 hover:text-violet-600"
          >
            Voltar ao dashboard
          </Link>
        </header>

        {feedback && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {feedback}
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl">
          {loading ? (
            <p className="text-sm text-slate-500">Carregando...</p>
          ) : (
            <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Nome</label>
                <input
                  value={profile.displayName ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
                  placeholder="Seu nome"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Organização</label>
                <input
                  value={profile.organizationName ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, organizationName: e.target.value }))}
                  placeholder="Empresa/Evento"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">E-mail</label>
                <input
                  value={profile.email ?? ""}
                  disabled
                  className="cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
                />
              </div>

              <div className="sm:col-span-2 mt-2 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Recusar convites para moderador</p>
                  <p className="text-xs text-slate-600">Quando ativado, outras pessoas não poderão adicionar seu e-mail como moderador.</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={profile.acceptModeratorInvites === false}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, acceptModeratorInvites: e.target.checked ? false : true }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-sm text-slate-700">Ativar</span>
                </label>
              </div>

              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-full bg-violet-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </ProtectedRoute>
  );
}

