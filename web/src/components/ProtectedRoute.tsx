"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";

export const ProtectedRoute = ({
  children,
  allowedEmails,
}: {
  children: React.ReactNode;
  allowedEmails?: string[];
}) => {
  const router = useRouter();
  const { user, loading } = useAuth();
  const isAuthenticated = Boolean(user && !user.isAnonymous);

  const normalizedEmail = user?.email?.toLowerCase() ?? null;

  const isAllowed = useMemo(() => {
    if (!allowedEmails || !allowedEmails.length) return true;
    return normalizedEmail ? allowedEmails.map((item) => item.toLowerCase()).includes(normalizedEmail) : false;
  }, [allowedEmails, normalizedEmail]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, loading, router]);

  if (loading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white/70">
        <span className="animate-pulse text-sm text-slate-500">Carregando...</span>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white/80 px-6 text-center text-slate-700">
        <p className="text-lg font-semibold text-slate-900">Acesso nao autorizado</p>
        <p className="max-w-md text-sm text-slate-600">
          Seu e-mail nao esta associado a moderacao desta sala. Confirme com a organizacao ou faca login com outro endereco.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

