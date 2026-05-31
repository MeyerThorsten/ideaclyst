import EvidenceTable from "@/components/evidence-table";
import { listEvidence } from "@/lib/evidence/store";

export const dynamic = "force-dynamic";

export default async function EvidencePage() {
  const records = await listEvidence();
  const strong = records.filter((record) => record.confidenceScore >= 75).length;
  const weak = records.filter((record) => record.confidenceScore < 50).length;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Evidence</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">Source browser and citation audit</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
          A local index of source-backed evidence from runs, discoveries, and full idea reports. Scraped or offline-looking sources are marked weak instead of being hidden.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-2xl font-bold text-zinc-900">{records.length}</div>
          <div className="text-xs text-zinc-500">Indexed sources</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-2xl font-bold text-zinc-900">{strong}</div>
          <div className="text-xs text-zinc-500">Strong evidence</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-2xl font-bold text-zinc-900">{weak}</div>
          <div className="text-xs text-zinc-500">Needs verification</div>
        </div>
      </div>

      <EvidenceTable records={records} />
    </div>
  );
}
