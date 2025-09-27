import Link from "next/link";

const features = [
  {
    title: "Perguntas sem atrito",
    description:
      "Participantes entram via QR Code e enviam perguntas anonimas ou identificadas sem ver os outros envios.",
  },
  {
    title: "Moderacao em tempo real",
    description:
      "Aceite, recuse ou limpe filas inteiras com poucos cliques enquanto acompanha o evento.",
  },
  {
    title: "Design minimalista",
    description:
      "Um painel elegante, responsivo e pensado para eventos corporativos, workshops e meetups.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center px-6 pb-24 pt-16">
      <header className="flex w-full max-w-5xl flex-col gap-6 text-center sm:text-left">
        <Link
          href="/"
          className="mx-auto inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-violet-600 shadow-sm transition hover:border-violet-300 hover:text-violet-700 sm:mx-0"
        >
          EventQ
        </Link>
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-900 sm:text-6xl">
          Perguntas inteligentes para eventos memoraveis.
        </h1>
        <p className="max-w-2xl text-balance text-base text-slate-600 sm:text-lg">
          Crie salas em segundos, distribua um QR Code elegante e mantenha a conversa fluindo com moderacao refinada.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/register"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500"
          >
            Comece agora
            <span className="transition group-hover:translate-x-1">→</span>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
          >
            Ja tenho uma conta
          </Link>
        </div>
      </header>

      <section className="mt-20 grid w-full max-w-5xl gap-6 rounded-3xl border border-slate-200/80 bg-white/80 p-8 shadow-xl backdrop-blur-md sm:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{feature.title}</h2>
            <p className="text-sm text-slate-600">{feature.description}</p>
          </div>
        ))}
      </section>

      <section className="mt-20 flex w-full max-w-4xl flex-col gap-6 rounded-3xl border border-slate-200 bg-white/90 p-8 text-center shadow-xl backdrop-blur">
        <h3 className="text-2xl font-semibold text-slate-900">Fluxo do evento</h3>
        <div className="grid gap-4 text-left text-sm text-slate-600 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="font-semibold text-slate-900">1. Crie a sala</p>
            <p className="mt-2 text-slate-600">Defina nome, moderador e gere o QR Code personalizado.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="font-semibold text-slate-900">2. Coleta discreta</p>
            <p className="mt-2 text-slate-600">Participantes enviam perguntas e acompanham apenas o proprio historico.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="font-semibold text-slate-900">3. Modere ao vivo</p>
            <p className="mt-2 text-slate-600">Aprove ou descarte perguntas com filtros automaticos de linguagem.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
