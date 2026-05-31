import SourceLanesEditor from "@/components/source-lanes-editor";
import { cacheStats } from "@/lib/research/cache";
import { listSourceLanes } from "@/lib/research/source-lanes";

export const dynamic = "force-dynamic";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function ResearchSettingsPage() {
  const [lanes, stats] = await Promise.all([listSourceLanes(), cacheStats()]);
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Research</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">Source lane builder</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
          Configure query templates and caps locally. Templates must keep the {"{domain}"} placeholder, and bad input is normalized before discovery can use it.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-2xl font-bold text-zinc-900">{stats.entries}</div>
          <div className="text-xs text-zinc-500">Cache entries</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-2xl font-bold text-zinc-900">{formatBytes(stats.bytes)}</div>
          <div className="text-xs text-zinc-500">Cache size</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-2xl font-bold text-zinc-900">{Math.round(stats.ttlMs / 3_600_000)}h</div>
          <div className="text-xs text-zinc-500">TTL</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-2xl font-bold text-zinc-900">{stats.maxEntries}</div>
          <div className="text-xs text-zinc-500">Entry cap</div>
        </div>
      </div>
      <SourceLanesEditor initialLanes={lanes} />
    </div>
  );
}
