"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { auth } from "@/lib/firebase";

export const SignOutButton = () => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 shadow-sm transition hover:border-violet-200 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Saindo..." : "Sair"}
    </button>
  );
};
