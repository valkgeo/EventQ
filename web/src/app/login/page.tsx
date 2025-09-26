"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { signInWithEmailAndPassword, AuthErrorCodes } from "firebase/auth";
import { auth } from "@/lib/firebase";

const mapAuthError = (code: string) => {
  switch (code) {
    case AuthErrorCodes.INVALID_PASSWORD:
    case AuthErrorCodes.INVALID_EMAIL:
    case AuthErrorCodes.USER_DELETED:
      return "Credenciais inválidas. Confira e tente novamente.";
    case AuthErrorCodes.TOO_MANY_ATTEMPTS_TRY_LATER:
      return "Muitas tentativas. Aguarde um momento e tente novamente.";
    default:
      return "Não foi possível iniciar a sessão agora.";
  }
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const redirectTo = searchParams.get("redirect") || "/dashboard";
      if (credential.user.emailVerified || !credential.user.email) {
        router.push(redirectTo);
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      setError(mapAuthError(code));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-800/80 bg-slate-900/40 p-10 shadow-xl backdrop-blur">
        <div className="mb-8 flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold text-slate-100">Que bom ter você de volta.</h1>
          <p className="text-sm text-slate-400">Acesse o painel e conduza perguntas com elegância.</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-xs uppercase tracking-[0.3em] text-slate-500">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-slate-500"
              placeholder="voce@empresa.com"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-slate-500"
              placeholder="********"
            />
          </div>

          {error && <p className="rounded-2xl border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-full bg-slate-100 px-6 py-3 text-sm font-medium text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-500">
          Ainda não tem acesso? <Link href="/register" className="text-slate-200 underline">Solicite cadastro</Link>.
        </p>
      </div>
    </div>
  );
}
