import Image from "next/image";
import Link from "next/link";

const features = [
  {
    title: "Perguntas sem atrito",
    description:
      "Participantes entram via QR Code e enviam perguntas anônimas ou identificadas sem ver os outros envios.",
  },
  {
    title: "Moderação em tempo real",
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
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(191,219,254,0.45),_transparent_55%),radial-gradient(circle_at_bottom_right,_rgba(199,210,254,0.4),_transparent_45%)]">
      <div className="pointer-events-none absolute -left-28 top-24 h-72 w-72 rounded-full bg-violet-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-36 bottom-12 h-80 w-80 rounded-full bg-sky-200/50 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-24 px-6 py-20">
        <section className="grid items-center gap-12 md:grid-cols-2">
          <div className="max-w-xl space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-500 shadow-sm">
              EventsQ
            </span>
            <div className="space-y-5">
              <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
                Perguntas inteligentes para eventos memoráveis.
              </h1>
              <p className="text-base text-slate-600 md:text-lg">
                Crie salas em segundos, distribua um QR Code elegante e mantenha a conversa fluindo com moderação refinada.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-violet-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-violet-600/25 transition hover:brightness-110"
              >
                Comece agora →
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
              >
                Já tenho uma conta
              </Link>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-2xl backdrop-blur">
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white via-slate-50 to-indigo-50" />
              <Image
                src="/Plateia_EventQ.png"
                alt="Apresentador mostrando QR Code para a plateia"
                width={640}
                height={480}
                className="h-auto w-full"
                priority
              />
            </div>
          </div>
        </section>

        <section className="space-y-12">
          <div className="grid gap-6 text-center sm:text-left md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="space-y-3 rounded-3xl border border-slate-200 bg-white/90 p-6 text-slate-600 shadow-md transition hover:-translate-y-1 hover:shadow-xl"
              >
                <h2 className="text-lg font-semibold text-slate-900">{feature.title}</h2>
                <p className="text-sm leading-relaxed">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
