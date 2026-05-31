import Link from "next/link";

import { listInterviewTargets } from "@/lib/interviews/store";

export const dynamic = "force-dynamic";

export default async function InterviewsPage() {
  const targets = await listInterviewTargets();
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Validation</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">Customer interview CRM</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
          Interview targets are generated from saved report personas and persisted locally. Add real notes by editing the exported JSON/Markdown after conversations.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {targets.map((target) => (
          <Link key={target.id} href={target.candidateHref} className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm hover:bg-zinc-50">
            <span className="font-semibold text-zinc-900">{target.persona}</span>
            <span className="mt-1 block text-xs text-zinc-500">{target.candidateTitle} · {target.status}</span>
            <span className="mt-3 block text-zinc-600">{target.outreachPrompt}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
