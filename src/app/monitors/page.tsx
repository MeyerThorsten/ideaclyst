import { refreshMonitorSnapshots } from "@/lib/monitors/store";

export const dynamic = "force-dynamic";

export default async function MonitorsPage() {
  const monitor = await refreshMonitorSnapshots();
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Monitor</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">Competitor and trend monitor</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
          Local snapshots from saved source evidence. Rerunning this page writes a new monitor snapshot and human-readable diff under `.ideaclyst/monitors`.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-2xl font-bold text-zinc-900">{monitor.snapshots.length}</div>
          <div className="text-xs text-zinc-500">Targets</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-2xl font-bold text-zinc-900">{monitor.diffs.filter((diff) => diff.change.startsWith("New")).length}</div>
          <div className="text-xs text-zinc-500">New</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-2xl font-bold text-zinc-900">{monitor.diffs.filter((diff) => diff.change.startsWith("Baseline")).length}</div>
          <div className="text-xs text-zinc-500">Changed</div>
        </div>
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white">
        {monitor.diffs.map((diff) => (
          <a key={`${diff.url}-${diff.category}`} href={diff.url} target="_blank" rel="noreferrer" className="block border-b border-zinc-100 p-4 text-sm last:border-0 hover:bg-zinc-50">
            <span className="font-semibold text-zinc-900">{diff.target}</span>
            <span className="ml-2 text-xs text-zinc-400">{diff.category}</span>
            <span className="mt-1 block text-zinc-600">{diff.change}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
