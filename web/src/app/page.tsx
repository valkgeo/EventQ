import Link from "next/link";

const features = [
  {
    title: "Perguntas sem atrito",
    description: "Participantes entram via QR Code e enviam perguntas anônimas ou identificadas sem ver os outros envios.",
  },
  {
    title: "Moderação em tempo real",
    description: "Aceite, recuse ou limpe filas inteiras com poucos cliques enquanto acompanha o evento.",
  },
  {
    title: "Design minimalista",
    description: "Um painel elegante, responsivo e pensado para eventos corporativos, workshops e meetups.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-transparent px-6 pb-24 pt-20">
      <header className="flex w-full max-w-5xl flex-col gap-8 text-center sm:text-left">
        <Link href="/" className="mx-auto inline-flex items-center gap-2 rounded-full border border-slate-700/80 px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-400 transition hover:border-slate-400/80 sm:mx-0">
          EventQ
        </Link>
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-100 sm:text-6xl">
          Perguntas inteligentes para eventos memoráveis.
        </h1>
        <p className="max-w-2xl text-balance text-base text-slate-400 sm:text-lg">
          Crie salas em segundos, distribua um QR Code elegante e mantenha a conversa fluindo com moderação refinada.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/register"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-slate-100 px-6 py-3 text-sm font-medium text-slate-900 transition hover:bg-white"
          >
            Comece agora
            <span className="transition group-hover:translate-x-1">?</span>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full border border-slate-600 px-6 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-400 hover:text-white"
          >
            Já tenho uma conta
          </Link>
        </div>
      </header>

      <section className="mt-20 grid w-full max-w-5xl gap-6 rounded-3xl border border-slate-800/80 bg-slate-900/35 p-8 shadow-lg backdrop-blur-md sm:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className="flex flex-col gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6">
            <h2 className="text-lg font-semibold text-slate-100">{feature.title}</h2>
            <p className="text-sm text-slate-400">{feature.description}</p>
          </div>
        ))}
      </section>

      <section className="mt-20 flex w-full max-w-4xl flex-col gap-6 rounded-3xl border border-slate-800/80 bg-slate-900/35 p-8 text-center shadow-lg backdrop-blur">
        <h3 className="text-2xl font-semibold text-slate-100">Fluxo do evento</h3>
        <div className="grid gap-4 text-left text-sm text-slate-400 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-5">
            <p className="font-semibold text-slate-200">1. Crie a sala</p>
            <p className="mt-2 text-slate-400">Defina nome, moderador e gere o QR Code personalizado.</p>
          </div>
          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-5">
            <p className="font-semibold text-slate-200">2. Coleta discreta</p>
            <p className="mt-2 text-slate-400">Participantes enviam perguntas e acompanham apenas o próprio histórico.</p>
          </div>
          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-5">
            <p className="font-semibold text-slate-200">3. Modere ao vivo</p>
            <p className="mt-2 text-slate-400">Aprove ou descarte perguntas com filtros automáticos de linguagem.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
