import Link from "next/link";

import DiscoveryForm from "@/components/discovery-form";
import { listDiscoveries } from "@/lib/discovery/store";
import StatusPill from "@/components/status-pill";

// Always read fresh from disk — discoveries change as scouting progresses.
export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const discoveries = await listDiscoveries();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Discover ideas</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Don&apos;t have an idea yet? Give a market and let surfagent scout the web for
          problems worth solving — then send the best candidate to the council.
        </p>
      </div>

      <DiscoveryForm />

      {discoveries.length > 0 ? (
        <div className="mt-10">
          <h2 className="mb-3 text-sm font-semibold text-zinc-700">Recent scouts</h2>
          <div className="space-y-2">
            {discoveries.map((d) => (
              <Link
                key={d.id}
                href={`/discover/${d.id}`}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 transition hover:border-zinc-300"
              >
                <div>
                  <div className="text-sm font-medium text-zinc-900">{d.domain}</div>
                  <div className="text-xs text-zinc-500">
                    {d.candidates.length} candidate{d.candidates.length === 1 ? "" : "s"}
                  </div>
                </div>
                <StatusPill status={d.status} />
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
