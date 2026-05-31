import Link from "next/link";
import { notFound } from "next/navigation";

import { getCandidateRef } from "@/lib/discovery/candidates";
import { listReportVersions } from "@/lib/discovery/reports";

export const dynamic = "force-dynamic";

export default async function ReportVersionsPage({
  params,
}: {
  params: Promise<{ id: string; candidateId: string }>;
}) {
  const { id, candidateId } = await params;
  const ref = await getCandidateRef(id, candidateId);
  if (!ref) notFound();
  const versions = await listReportVersions(id, candidateId);
  return (
    <div className="space-y-6">
      <Link href={ref.href} className="text-sm text-zinc-500 hover:text-zinc-900">Back to report</Link>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Reports</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">Report version history</h1>
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white">
        {versions.length ? versions.map((version) => (
          <article key={version.id} className="border-b border-zinc-100 p-5 last:border-0">
            <div className="text-xs text-zinc-500">{new Date(version.generatedAt).toLocaleString()}</div>
            <h2 className="mt-1 text-lg font-semibold text-zinc-900">{version.diff.summary}</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {[version.diff.scoreDeltas, version.diff.sourceDeltas, version.diff.actionDeltas].map((items, index) => (
                <div key={index} className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600 ring-1 ring-inset ring-zinc-200">
                  {(items.length ? items : ["No changes."]).map((item) => <div key={item}>{item}</div>)}
                </div>
              ))}
            </div>
          </article>
        )) : (
          <div className="p-8 text-sm text-zinc-500">No prior report versions yet. Use “Rerun report only” from the report page.</div>
        )}
      </div>
    </div>
  );
}
