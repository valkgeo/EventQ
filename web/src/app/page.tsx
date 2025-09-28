import Image from "next/image";
import Link from "next/link";

const features = [
  { title: "Perguntas sem atrito", description: "Participantes entram via QR Code e enviam perguntas anônimas ou identificadas sem ver os outros envios." },
  { title: "Moderação em tempo real", description: "Aceite, recuse ou limpe filas inteiras com poucos cliques enquanto acompanha o evento." },
  { title: "Design minimalista", description: "Um painel elegante, responsivo e pensado para eventos corporativos, workshops, eventos científicos, meetups etc." },
];

const flow = [
  {
    title: "1. Crie sua sala",
    desc: "Defina nome e gere um QR Code para os participantes entrarem.",
    type: "create",
  },
  {
    title: "2. Colete perguntas",
    desc: "As pessoas enviam perguntas e podem dar like nas que a moderação destacar e querem ver respondidas.",
    type: "collect",
  },
  {
    title: "3. Compartilhe no seu evento",
    desc: "Moderadores mostram ou leêm as perguntas selecionadas e gerenciam ao vivo.",
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
      <div className="pointer-events-none absolute -left-40 bottom-0 h-96 w-96 rounded-[45%] bg-purple-200/35 blur-[100px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-24 px-6 py-20">
        {/* HERO */}
        <section className="grid items-center gap-8 md:grid-cols-12">
          {/* Texto (7 colunas) */}
          <div className="md:col-span-7 max-w-2xl space-y-8">
            {/* Brand grande com logo */}
            <div className="flex items-center gap-3">
              <Image
                src="/logotipo.png"     // coloque seu arquivo em /public/logotipo.png
                alt="Logo EventsQ"
                width={36}
                height={36}
                className="h-9 w-9 rounded-md"
                priority
              />
              <div className="text-2xl font-semibold tracking-tight">
                <span className="text-slate-900">Events</span>
                <span className="text-purple-600">Q</span>
              </div>
            </div>
            <div className="md:col-span-7 lg:max-w-3xl max-w-none space-y-8">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight tracking-tight text-slate-900">
                {/* Mobile: quebra natural */}
                <span className="md:hidden">
                  Perguntas inteligentes para eventos memoráveis.
                </span>

                {/* Desktop/Tablet: duas linhas fixas */}
                <span className="hidden md:inline">
                  <span className="whitespace-nowrap">Perguntas&nbsp;inteligentes&nbsp;para</span><br />
                  <span className="whitespace-nowrap">eventos&nbsp;memoráveis.</span>
                </span>
              </h1>
              <p className="text-base text-slate-600 md:text-lg">
                Crie salas em segundos, distribua um QR Code elegante e receba perguntas com moderação fácil e refinada – tudo 100% grátis.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full 
                          bg-gradient-to-r from-purple-500 to-violet-600 
                          px-6 py-3 text-sm font-medium text-white 
                          shadow-lg shadow-violet-600/25 transition hover:brightness-110"
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

          {/* Ilustração (5 colunas) */}
          <div className="md:col-span-5 flex items-center justify-center">
            <Image
              src="/Plateia_EventQ.png"
              alt="Apresentador mostrando QR Code para a plateia"
              width={820}
              height={560}
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
                <div className="rounded-2xl bg-purple-600 p-5 text-white shadow-lg ring-1 ring-purple-800/40">
                  {type === "create" && (
                    <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
                      <div>
                        <div className="text-sm font-semibold opacity-90">eventsq</div>
                        <div className="mt-2 text-purple-100">
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
                      <div className="rounded-xl bg-purple-700/60 p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-purple-500/70" />
                          <div className="h-2 w-40 rounded bg-purple-300/60" />
                          <div className="ml-auto flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-xs">
                            <span className="font-bold">13</span>
                            <span>👍</span>
                          </div>
                        </div>
                        <div className="mt-2 h-2 w-56 rounded bg-purple-300/40" />
                      </div>
                      <div className="rounded-xl bg-purple-700/40 p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-purple-500/60" />
                          <div className="h-2 w-32 rounded bg-purple-300/50" />
                          <div className="ml-auto flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-xs">
                            <span className="font-bold">6</span>
                            <span>👍</span>
                          </div>
                        </div>
                        <div className="mt-2 h-2 w-48 rounded bg-purple-300/30" />
                      </div>
                    </div>
                  )}

                  {type === "share" && (
                    <div className="grid grid-cols-[auto_1fr] gap-3">
                      <div className="flex flex-col gap-2 pt-1">
                        <div className="h-1.5 w-8 rounded bg-purple-200/70" />
                        <div className="h-1.5 w-6 rounded bg-purple-200/60" />
                        <div className="h-1.5 w-10 rounded bg-purple-200/60" />
                      </div>
                      <div className="space-y-2">
                        {[32, 18, 0].map((likes, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 rounded-lg bg-purple-700/50 px-3 py-2"
                          >
                            <div className="h-2 w-40 rounded bg-purple-200/60" />
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
        – Cópia e modificação permitidos apenas em contextos não comerciais.
      </footer>
    </main>
  );
}