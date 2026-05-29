import { listRuns } from "@/lib/runs/store";
import RunCard from "@/components/run-card";
import EmptyState from "@/components/empty-state";

// Always read fresh from disk — runs change as the council progresses.
export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const runs = await listRuns();

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Idea sessions
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {runs.length === 0
              ? "Nothing here yet."
              : `${runs.length} session${runs.length === 1 ? "" : "s"}.`}
          </p>
        </div>
      </div>

      {runs.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {runs.map((run) => (
            <RunCard key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}
