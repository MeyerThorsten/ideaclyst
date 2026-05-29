import Link from "next/link";

const COUNCIL = [
  {
    n: "01",
    who: "Claude",
    role: "Product strategist",
    blurb: "A skeptical SaaS founder pressure-tests the idea into a real strategy.",
  },
  {
    n: "02",
    who: "Codex",
    role: "Pragmatic CTO",
    blurb: "Designs a lean, buildable architecture for the MVP.",
  },
  {
    n: "03",
    who: "Claude",
    role: "Critique",
    blurb: "Challenges the architecture from a product and shipping lens.",
  },
  {
    n: "04",
    who: "Codex",
    role: "Critique",
    blurb: "Challenges the strategy from an engineering-reality lens.",
  },
  {
    n: "05",
    who: "Claude",
    role: "Synthesis",
    blurb: "Reconciles everything into a decisive founder planning packet.",
  },
];

const EXAMPLES = [
  "Standup notes that write themselves from your team's git + calendar",
  "A pricing-page A/B tool built for solo SaaS founders",
  "Turn customer support transcripts into a self-serve help center",
];

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="text-center">
        <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-2xl font-bold text-white">
          I
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
          IdeaClyst
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-600">
          Catalyze rough ideas into buildable SaaS plans. Submit an idea and let a
          structured council between <span className="font-medium text-zinc-900">Claude</span>{" "}
          and <span className="font-medium text-zinc-900">Codex</span> argue it into a
          founder planning packet.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/new"
            className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-zinc-700"
          >
            Start an Idea Session
          </Link>
          <Link
            href="/runs"
            className="rounded-lg border border-zinc-300 bg-white px-6 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            View past sessions
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-zinc-400">
          The council
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {COUNCIL.map((c) => (
            <div
              key={c.n}
              className="rounded-xl border border-zinc-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400">{c.n}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                    c.who === "Claude"
                      ? "bg-indigo-50 text-indigo-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {c.who}
                </span>
              </div>
              <h3 className="mt-2 text-sm font-semibold text-zinc-900">{c.role}</h3>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">{c.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Try it with an idea like
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {EXAMPLES.map((e) => (
            <Link
              key={e}
              href="/new"
              className="group rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700 transition hover:border-indigo-300 hover:shadow-sm"
            >
              <span className="block leading-relaxed group-hover:text-zinc-900">
                “{e}”
              </span>
              <span className="mt-3 inline-block text-xs font-medium text-indigo-600">
                Start with this →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
