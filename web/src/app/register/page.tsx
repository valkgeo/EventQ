"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AuthErrorCodes,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const mapRegisterError = (code: string) => {
  switch (code) {
    case AuthErrorCodes.EMAIL_EXISTS:
      return "Este e-mail já está cadastrado.";
    case AuthErrorCodes.INVALID_PASSWORD:
      return "A senha precisa de pelo menos 6 caracteres.";
    default:
      return "Não foi possível concluir o cadastro.";
  }
};

export default function RegisterPage() {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState("");
  const [moderatorName, setModeratorName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("As senhas precisam ser iguais.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: moderatorName });
      await setDoc(doc(db, "users", credential.user.uid), {
        organizationName,
        displayName: moderatorName,
        email,
        createdAt: serverTimestamp(),
      });
      router.push("/dashboard");
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      setError(mapRegisterError(code));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-xl rounded-3xl border border-slate-800/80 bg-slate-900/40 p-10 shadow-xl backdrop-blur">
        <div className="mb-8 flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold text-slate-100">Crie seu espaço EventQ</h1>
          <p className="text-sm text-slate-400">
            Cadastre a organização responsável e um moderador principal para começar agora mesmo.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="organization" className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Organização
            </label>
            <input
              id="organization"
              required
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder="Nome do evento ou empresa"
              className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-slate-500"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="moderator" className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Moderador principal
            </label>
            <input
              id="moderator"
              required
              value={moderatorName}
              onChange={(event) => setModeratorName(event.target.value)}
              placeholder="Nome completo"
              className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-slate-500"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-xs uppercase tracking-[0.3em] text-slate-500">
              E-mail corporativo
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="moderador@evento.com"
              className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-slate-500"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Senha
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="********"
                className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-slate-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="confirm-password" className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Confirmar senha
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="********"
                className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-slate-500"
              />
            </div>
          </div>

          {error && <p className="rounded-2xl border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-full bg-slate-100 px-6 py-3 text-sm font-medium text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Criando..." : "Criar conta"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-500">
          Já tem acesso? <Link href="/login" className="text-slate-200 underline">Entrar</Link>.
        </p>
      </div>
    </div>
  );
}
