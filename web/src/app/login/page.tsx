"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword, AuthErrorCodes, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

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

  const handleGoogle = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      const user = credential.user;

      // Ensure user profile exists in Firestore
      if (user?.uid) {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          const email = user.email ?? "";
          const displayName = user.displayName ?? "";
          const organizationName = displayName || (email.includes("@") ? email.split("@")[1] : "");
          await setDoc(
            userRef,
            {
              organizationName,
              displayName,
              email,
              createdAt: serverTimestamp(),
            },
            { merge: true }
          );
        }
      }

      const redirectTo = searchParams.get("redirect") || "/dashboard";
      router.push(redirectTo);
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

      <div className="my-2 flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">ou</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        type="button"
        onClick={() => void handleGoogle()}
        disabled={submitting}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-violet-200 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.651 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 18.961 14 24 14c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.197l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.62-3.319-11.283-7.938l-6.49 5.006C9.521 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.207-4.089 5.654l.003-.002 6.19 5.238C36.961 40.428 44 36 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
        Entrar com Google
      </button>
    </form>
  );
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/90 p-10 shadow-2xl backdrop-blur">
        <div className="mb-4 text-left">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 transition hover:text-violet-500"
          >
            ← Voltar para o site
          </Link>
        </div>
        <div className="mb-8 flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Que bom ter voce de volta.</h1>
          <p className="text-sm text-slate-600">Acesse o painel e conduza perguntas com elegancia.</p>
        </div>
        <Suspense fallback={<p className="text-sm text-slate-500">Carregando formulario...</p>}>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-center text-xs text-slate-500">
          Ainda nao tem acesso? <Link href="/register" className="font-medium text-violet-600 underline">Realizar cadastro</Link>.
        </p>
      </div>
    </div>
  );
}
