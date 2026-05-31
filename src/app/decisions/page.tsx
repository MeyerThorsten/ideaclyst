import Link from "next/link";

import { listDecisions } from "@/lib/decisions/store";

export const dynamic = "force-dynamic";

export default async function DecisionsPage() {
  const decisions = await listDecisions();
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Operations</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">Founder decision log</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
          Promotion, parking, kill, validation, and assumption notes are persisted locally with evidence and Markdown export.
        </p>
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white">
        {decisions.length ? decisions.map((decision) => (
          <article key={decision.id} className="border-b border-zinc-100 p-5 last:border-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{decision.type}</div>
                <h2 className="mt-1 text-lg font-semibold text-zinc-900">{decision.title}</h2>
              </div>
              {decision.href ? <Link href={decision.href} className="text-sm font-medium text-indigo-600">Open</Link> : null}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{decision.rationale}</p>
            <p className="mt-2 text-xs text-zinc-500">Evidence: {decision.evidence || "No evidence note supplied."}</p>
          </article>
        )) : (
          <div className="p-8 text-sm text-zinc-500">No decisions logged yet. Open an idea report and use the decision buttons.</div>
        )}
      </div>
    </div>
  );
}
