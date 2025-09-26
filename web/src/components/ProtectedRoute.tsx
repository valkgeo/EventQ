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

  const isAllowed = useMemo(() => {
    if (!allowedEmails || !allowedEmails.length) return true;
    const email = user?.email?.toLowerCase();
    return email ? allowedEmails.map((item) => item.toLowerCase()).includes(email) : false;
  }, [allowedEmails, user?.email]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950/95">
        <span className="animate-pulse text-sm text-slate-200">Carregando...</span>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950/95 text-center text-slate-200">
        <p className="text-lg font-semibold">Acesso nao autorizado</p>
        <p className="max-w-md text-sm text-slate-400">
          Seu e-mail nao esta associado a moderacao desta sala. Confirme com a organizacao ou faca login
          com outro endereco.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
