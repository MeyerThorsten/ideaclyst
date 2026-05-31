import Link from "next/link";

import { validationAnalytics } from "@/lib/validation/store";

export const dynamic = "force-dynamic";

export default async function ValidationAnalyticsPage() {
  const rows = await validationAnalytics();
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Validation</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">Validation experiment analytics</h1>
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white">
        {rows.map((row) => (
          <Link key={row.candidateHref} href={row.candidateHref} className="grid gap-3 border-b border-zinc-100 p-4 text-sm last:border-0 sm:grid-cols-6">
            <span className="font-semibold text-zinc-900 sm:col-span-2">{row.candidateTitle}</span>
            <span>{row.total} tests</span>
            <span>{row.running} running</span>
            <span>{row.passRate}% pass rate</span>
            <span>{row.importedScore ? `${row.importedScore}/100 imported` : `${row.importedResults} imports`}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
