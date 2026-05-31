import Link from "next/link";
import { notFound } from "next/navigation";

import { getCandidateRef } from "@/lib/discovery/candidates";
import { advisorAnswers } from "@/lib/report-tools/generators";

export const dynamic = "force-dynamic";

export default async function AdvisorPage({ params }: { params: Promise<{ id: string; candidateId: string }> }) {
  const { id, candidateId } = await params;
  const ref = await getCandidateRef(id, candidateId);
  if (!ref) notFound();

  return (
    <div className="space-y-6">
      <Link href={ref.href} className="text-sm text-zinc-500 hover:text-zinc-900">Back to report</Link>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Advisor</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">Chat with this idea report</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
          A lightweight, local advisor surface. Answers are grounded in the saved report and explicitly avoid inventing missing evidence.
        </p>
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="space-y-3">
          {advisorAnswers(ref).map((answer, index) => (
            <div key={answer} className="rounded-xl bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-700 ring-1 ring-inset ring-zinc-200">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Answer {index + 1}</div>
              {answer}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
