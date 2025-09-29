import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Analytics } from "@vercel/analytics/react"; 

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EventQ",
  description:
    "Gerencie perguntas em tempo real em eventos com moderacao elegante e QR Code para participantes.",
  icons: {
    icon: "/logotipo.png",      // favicon padrão
    shortcut: "/logotipo.png",  // fallback
    apple: "/logotipo.png",     // ícone para iOS
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-slate-900`}
      >
        <AuthProvider>{children}</AuthProvider>
        <Analytics /> 
      </body>
    </html>
  );
}
