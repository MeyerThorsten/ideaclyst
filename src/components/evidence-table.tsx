import Link from "next/link";

import { EvidenceRecord } from "@/lib/evidence/store";

export default function EvidenceTable({ records }: { records: EvidenceRecord[] }) {
  if (!records.length) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-sm text-zinc-500">
        No source-backed evidence has been captured yet. Run a live discovery or council research pass to populate this audit.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.8fr] gap-0 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        <span>Source and claims</span>
        <span>Linked artifact</span>
        <span>Confidence</span>
        <span>Freshness</span>
      </div>
      {records.map((record) => (
        <div key={record.id} className="grid gap-3 border-b border-zinc-100 px-4 py-4 text-sm last:border-0 md:grid-cols-[1.2fr_0.8fr_0.7fr_0.8fr]">
          <div>
            <a href={record.url} target="_blank" rel="noreferrer" className="font-semibold text-zinc-900 hover:underline">
              {record.title}
            </a>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
              <span>{record.sourceName}</span>
              <span>{record.sourceType}</span>
            </div>
            <p className="mt-2 line-clamp-3 text-zinc-600">{record.summary}</p>
            {record.claims.length ? (
              <ul className="mt-2 space-y-1 text-xs text-zinc-500">
                {record.claims.map((claim) => (
                  <li key={claim}>- {claim}</li>
                ))}
              </ul>
            ) : null}
            {record.warning ? <p className="mt-2 text-xs font-medium text-amber-700">{record.warning}</p> : null}
          </div>
          <div>
            <Link href={record.parentHref} className="font-medium text-zinc-900 hover:underline">
              {record.parentTitle}
            </Link>
            <div className="mt-1 text-xs capitalize text-zinc-500">{record.parentType}</div>
          </div>
          <div>
            <span className="inline-flex rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
              {record.confidenceLabel}
            </span>
            <div className="mt-2 h-1.5 rounded-full bg-zinc-100">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${record.confidenceScore}%` }} />
            </div>
            <div className="mt-1 text-xs text-zinc-500">{record.confidenceScore}/100</div>
          </div>
          <div className="text-sm text-zinc-600">{record.freshnessLabel}</div>
        </div>
      ))}
    </div>
  );
}
