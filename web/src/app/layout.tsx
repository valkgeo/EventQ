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
  title: "EventsQ",
  description:
    "Facilite a interação nos seus eventos: receba perguntas via QR Code, modere com praticidade e mantenha o público conectado, totalmente gratuito.",
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/icon.png",
  },
  alternates: {
    canonical: "https://eventsq.org/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Verificação do Google Search Console */}
        <meta
          name="google-site-verification"
          content="Pt0UY0yV3pIocMWh9yv5Ejd6fM0i57ihGVcq3_kuhXw"
        />
        {/* Tag canônica redundante (reforça para bots antigos) */}
        <link rel="canonical" href="https://eventsq.org/" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-slate-900`}
      >
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
