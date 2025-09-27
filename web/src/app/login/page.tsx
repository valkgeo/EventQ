"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword, AuthErrorCodes } from "firebase/auth";
import { auth } from "@/lib/firebase";

const mapAuthError = (code: string) => {
  switch (code) {
    case AuthErrorCodes.INVALID_PASSWORD:
    case AuthErrorCodes.INVALID_EMAIL:
    case AuthErrorCodes.USER_DELETED:
      return "Credenciais invalidas. Confira e tente novamente.";
    case AuthErrorCodes.TOO_MANY_ATTEMPTS_TRY_LATER:
      return "Muitas tentativas. Aguarde um momento e tente novamente.";
    case AuthErrorCodes.OPERATION_NOT_ALLOWED:
      return "Login por e-mail e senha ainda nao esta habilitado no Firebase.";
    default:
      return "Nao foi possivel iniciar a sessao agora.";
  }
};

const LoginForm = () => {
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          placeholder="voce@empresa.com"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          Senha
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          placeholder="********"
        />
      </div>

      {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center rounded-full bg-violet-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/90 p-10 shadow-2xl backdrop-blur">
        <div className="mb-8 flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Que bom ter voce de volta.</h1>
          <p className="text-sm text-slate-600">Acesse o painel e conduza perguntas com elegancia.</p>
        </div>
        <Suspense fallback={<p className="text-sm text-slate-500">Carregando formulario...</p>}>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-center text-xs text-slate-500">
          Ainda nao tem acesso? <Link href="/register" className="font-medium text-violet-600 underline">Solicite cadastro</Link>.
        </p>
      </div>
    </div>
  );
}
