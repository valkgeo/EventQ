import Image from "next/image";
import Link from "next/link";

const features = [
  { title: "Perguntas sem atrito", description: "Participantes entram via QR Code e enviam, de forma anônima ou identificada, perguntas anônimas ou identificadas sem ver os outros envios." },
  { title: "Moderação em tempo real", description: "Aceite, recuse ou limpe filas inteiras com poucos cliques enquanto acompanha o evento." },
  { title: "Design minimalista", description: "Um painel elegante, responsivo e pensado para eventos corporativos, workshops e meetups." },
];

const flow = [
  {
    title: "1. Crie sua sala",
    desc: "Defina nome e gere um QR Code para os participantes entrarem.",
    type: "create",
  },
  {
    title: "2. Colete perguntas",
    desc: "As pessoas enviam e podem dar like nas perguntas que querem ver respondidas.",
    type: "collect",
  },
  {
    title: "3. Compartilhe no seu evento",
    desc: "Mostre as perguntas selecionadas e gerencie ao vivo.",
    type: "share",
  },
];

export default function Home() {
  return (
    <main
      className="
        relative min-h-screen overflow-hidden
        bg-white
        [background:
          radial-gradient(60rem_40rem_at_-10%_-10%,_rgba(191,219,254,0.45),_transparent_60%),
          radial-gradient(55rem_38rem_at_110%_20%,_rgba(199,210,254,0.40),_transparent_55%)
        ]
      "
    >
      {/* blobs suaves */}
      <div className="pointer-events-none absolute -left-24 top-16 h-80 w-80 rounded-[40%] bg-violet-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-24 h-72 w-72 rounded-[40%] bg-sky-200/45 blur-3xl" />
      <div className="pointer-events-none absolute -left-40 bottom-0 h-96 w-96 rounded-[45%] bg-indigo-200/35 blur-[100px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-24 px-6 py-20">
        {/* HERO */}
        <section className="grid items-center gap-12 md:grid-cols-2">
          {/* Texto */}
          <div className="max-w-xl space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] shadow-sm">
              <span className="text-slate-900">Events</span>
              <span className="text-blue-600">Q</span>
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

          {/* Ilustração */}
          <div className="relative flex items-center justify-center">
            <Image
              src="/Plateia_EventQ.png"
              alt="Apresentador mostrando QR Code para a plateia"
              width={640}
              height={480}
              className="h-auto w-full max-w-lg"
              priority
            />
          </div>
        </section>

        {/* FEATURES */}
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

        {/* FLUXO DO EVENTO */}
        <section className="space-y-10">
          <h2 className="text-center text-3xl font-bold text-slate-900">
            Fluxo do evento em 3 passos
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            {flow.map(({ title, desc, type }) => (
              <div key={title} className="space-y-4">
                <div className="rounded-2xl bg-indigo-600 p-5 text-white shadow-lg ring-1 ring-indigo-800/40">
                  {type === "create" && (
                    <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
                      <div>
                        <div className="text-sm font-semibold opacity-90">eventsq</div>
                        <div className="mt-2 text-indigo-100">
                          Entrar em <span className="font-semibold">eventsq.app</span>
                          <br />
                          <span className="opacity-90">#SalaExemplo</span>
                        </div>
                      </div>
                      <div className="aspect-square w-24 rounded-md bg-white p-1">
                        <Image
                          src="/QRCode.png"
                          alt="QR Code de exemplo"
                          width={100}
                          height={100}
                          className="h-auto w-auto"
                        />
                      </div>
                    </div>
                  )}

                  {type === "collect" && (
                    <div className="space-y-3">
                      <div className="rounded-xl bg-indigo-700/60 p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-indigo-500/70" />
                          <div className="h-2 w-40 rounded bg-indigo-300/60" />
                          <div className="ml-auto flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-xs">
                            <span className="font-bold">13</span>
                            <span>👍</span>
                          </div>
                        </div>
                        <div className="mt-2 h-2 w-56 rounded bg-indigo-300/40" />
                      </div>
                      <div className="rounded-xl bg-indigo-700/40 p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-indigo-500/60" />
                          <div className="h-2 w-32 rounded bg-indigo-300/50" />
                          <div className="ml-auto flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-xs">
                            <span className="font-bold">6</span>
                            <span>👍</span>
                          </div>
                        </div>
                        <div className="mt-2 h-2 w-48 rounded bg-indigo-300/30" />
                      </div>
                    </div>
                  )}

                  {type === "share" && (
                    <div className="grid grid-cols-[auto_1fr] gap-3">
                      <div className="flex flex-col gap-2 pt-1">
                        <div className="h-1.5 w-8 rounded bg-indigo-200/70" />
                        <div className="h-1.5 w-6 rounded bg-indigo-200/60" />
                        <div className="h-1.5 w-10 rounded bg-indigo-200/60" />
                      </div>
                      <div className="space-y-2">
                        {[32, 18, 0].map((likes, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 rounded-lg bg-indigo-700/50 px-3 py-2"
                          >
                            <div className="h-2 w-40 rounded bg-indigo-200/60" />
                            <div className="ml-auto flex items-center gap-1 text-xs opacity-90">
                              <span className="rounded bg-white/15 px-1.5 py-0.5">{likes}</span>
                              <span>👍</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
                  <p className="text-slate-600">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <footer className="mt-20 border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
        © 2025 <span className="font-semibold text-slate-700">EventsQ</span>. 
        Licenciado sob{" "}
        <a
          href="https://creativecommons.org/licenses/by-nc/4.0/"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 underline hover:text-slate-700"
        >
          CC BY-NC 4.0
        </a>{" "}
        – uso, cópia e modificação permitidos apenas em contextos não comerciais.
      </footer>
    </main>
  );
}