"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AuthErrorCodes,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const mapRegisterError = (code: string) => {
  switch (code) {
    case AuthErrorCodes.EMAIL_EXISTS:
      return "Este e-mail já está cadastrado.";
    case AuthErrorCodes.INVALID_PASSWORD:
      return "A senha precisa de pelo menos 6 caracteres.";
    case AuthErrorCodes.OPERATION_NOT_ALLOWED:
      return "Cadastro por e-mail e senha ainda não está habilitado no Firebase.";
    case "auth/unauthorized-domain":
      return "Domínio não autorizado no Firebase Auth. Adicione seu domínio do Vercel em Authentication > Settings > Authorized domains.";
    case "auth/popup-blocked":
      return "Popup bloqueado pelo navegador. Permita popups para continuar.";
    case "auth/popup-closed-by-user":
      return "Popup do Google foi fechado antes de concluir.";
    case "auth/operation-not-supported-in-this-environment":
      return "Este navegador/ambiente bloqueou o popup. Tente outro navegador ou habilite popups.";
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
  const [info, setInfo] = useState<string | null>(null);

  // Helper: cria/merge perfil no Firestore (salva org só se existir)
  const upsertUserDoc = async (uid: string, payload: Record<string, any>) => {
    const toSave: Record<string, any> = {
      displayName: payload.displayName,
      email: payload.email,
      createdAt: serverTimestamp(),
    };
    if (payload.organizationName?.trim()) {
      toSave.organizationName = payload.organizationName.trim();
    }
    await setDoc(doc(db, "users", uid), toSave, { merge: true });
  };

  // Verifica antes se o e-mail já está vinculado ao Google
  const guardIfGoogleOnly = async (emailToCheck: string) => {
    try {
      const methods = await fetchSignInMethodsForEmail(auth, emailToCheck);
      const hasGoogle = methods.includes("google.com");
      const hasPassword = methods.includes("password");

      if (hasGoogle && !hasPassword) {
        setError("Este e-mail já está cadastrado via Google. Use “Entrar com Google” na página de login.");
        setInfo(null);
        return true; // bloquear criação por senha
      }

      if (hasGoogle && hasPassword) {
        setInfo("Atenção: este e-mail já possui cadastro. Se preferir, você também pode entrar usando o Google.");
      }
    } catch {
      // se falhar a checagem, não bloqueie; apenas siga o fluxo
    }
    return false;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (password !== confirmPassword) {
      setError("As senhas precisam ser iguais.");
      return;
    }

    setSubmitting(true);
    try {
      // Bloqueia criação por senha se a conta for somente Google
      const block = await guardIfGoogleOnly(email);
      if (block) return;

      const credential = await createUserWithEmailAndPassword(auth, email, password);

      // Se o usuário não informou "Nome de Usuário", usamos o email local-part
      const finalDisplayName =
        moderatorName.trim() || (email.includes("@") ? email.split("@")[0] : "Usuário");

      await updateProfile(credential.user, { displayName: finalDisplayName });

      await upsertUserDoc(credential.user.uid, {
        organizationName, // opcional
        displayName: finalDisplayName,
        email,
      });

      router.push("/dashboard");
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      setError(mapRegisterError(code));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterWithGoogle = async () => {
    if (submitting) return; // evita duplo clique
    setError(null);
    setInfo(null);
    setSubmitting(true);

    const provider = new GoogleAuthProvider();

    try {
      const cred = await signInWithPopup(auth, provider);

      const user = cred.user;
      if (user?.uid) {
        const finalDisplayName =
          moderatorName.trim() ||
          user.displayName ||
          (user.email?.split("@")[0] ?? "Usuário");

        await upsertUserDoc(user.uid, {
          organizationName, // opcional
          displayName: finalDisplayName,
          email: user.email ?? "",
        });
      }

      router.push("/dashboard");
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";

      // 1) Popup fechado pelo usuário
      if (code === "auth/popup-closed-by-user") {
        setError("Popup do Google foi fechado antes de concluir.");
        return; // finally cuidará de limpar o loading
      }

      // 2) Popup bloqueado / ambiente sem suporte (⇐ AQUI estava o parêntese extra)
      if (
        code === "auth/popup-blocked" ||
        code === "auth/operation-not-supported-in-this-environment"
      ) {
        setSubmitting(false); // evita “Criando…” eterno
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirErr) {
          const rcode = (redirErr as { code?: string }).code ?? "";
          setError(mapRegisterError(rcode));
        }
        return;
      }

      // 3) Outros erros
      setError(mapRegisterError(code));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white/90 p-10 shadow-2xl backdrop-blur">
        <div className="mb-4 text-left">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 transition hover:text-violet-500"
          >
            ← Voltar para o site
          </Link>
        </div>

        <div className="mb-8 flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Crie sua conta no EventsQ</h1>
          <p className="text-sm text-slate-600">
            Você pode informar o evento agora ou depois no painel. O cadastro é 100% gratuito.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4">
          {/* Evento/Organização — OPCIONAL */}
          <div className="flex flex-col gap-2">
            <label htmlFor="organization" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Evento (opcional)
            </label>
            <input
              id="organization"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Nome do evento ou empresa"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>

          {/* Nome de Usuário — recomendado (usamos fallback se vazio) */}
          <div className="flex flex-col gap-2">
            <label htmlFor="moderator" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Nome de Usuário
            </label>
            <input
              id="moderator"
              value={moderatorName}
              onChange={(e) => setModeratorName(e.target.value)}
              placeholder="Seu nome completo ou apelido"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>

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
              onChange={(e) => setEmail(e.target.value)}
              onBlur={async () => {
                if (email) {
                  try {
                    const methods = await fetchSignInMethodsForEmail(auth, email);
                    if (methods.includes("google.com") && !methods.includes("password")) {
                      setInfo("Este e-mail já está cadastrado via Google. Use ‘Entrar com Google’ na página de login.");
                    } else {
                      setInfo(null);
                    }
                  } catch {
                    /* silencioso */
                  }
                }
              }}
              placeholder="voce@email.com"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Senha
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="confirm-password" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Confirmar senha
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="********"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600">{error}</p>
          )}
          {info && !error && (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">{info}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-full bg-violet-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Criando..." : "Criar conta"}
          </button>
        </form>

        <div className="my-3 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">ou</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        {/* Botão Google (cadastro) */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => void handleRegisterWithGoogle()}
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-violet-200 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.651 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 18.961 14 24 14c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.197l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.62-3.319-11.283-7.938l-6.49 5.006C9.521 39.556 16.227 44 24 44z"/>
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.207-4.089 5.654l.003-.002 6.19 5.238C36.961 40.428 44 36 44 24c0-1.341-.138-2.65-.389-3.917z"/>
            </svg>
            Criar conta com Google
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Já tem acesso? <Link href="/login" className="font-medium text-violet-600 underline">Entrar</Link>.
        </p>
      </div>
    </div>
  );
}
