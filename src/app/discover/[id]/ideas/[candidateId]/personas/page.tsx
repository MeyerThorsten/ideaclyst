import Link from "next/link";
import { notFound } from "next/navigation";

import { getCandidateRef } from "@/lib/discovery/candidates";
import { buyerPersonas } from "@/lib/report-tools/generators";

export const dynamic = "force-dynamic";

export default async function PersonasPage({ params }: { params: Promise<{ id: string; candidateId: string }> }) {
  const { id, candidateId } = await params;
  const ref = await getCandidateRef(id, candidateId);
  if (!ref) notFound();
  const personas = buyerPersonas(ref);

  return (
    <div className="space-y-6">
      <Link href={ref.href} className="text-sm text-zinc-500 hover:text-zinc-900">Back to report</Link>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Validation</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">Buyer persona simulator</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
          These are report-grounded skeptic personas for interview prep. They are not real customer evidence.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {personas.map((persona) => (
          <div key={persona} className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm leading-relaxed text-zinc-600">
            {persona}
          </div>
        ))}
      </div>
    </div>
  );
}
