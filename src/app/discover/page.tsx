import Link from "next/link";

import DiscoveryForm from "@/components/discovery-form";
import { listDiscoveries } from "@/lib/discovery/store";
import StatusPill from "@/components/status-pill";
import { getFounderProfile } from "@/lib/profile/store";
import { profileToDiscoveryContext } from "@/lib/profile/summary";
import { discoverySuggestions } from "@/lib/discovery/suggestions";
import { sourceLanePerformance } from "@/lib/discovery/analytics";

// Always read fresh from disk — discoveries change as scouting progresses.
export const dynamic = "force-dynamic";

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams?: Promise<{ domain?: string }>;
}) {
  const [discoveries, profile, suggestions, laneStats] = await Promise.all([
    listDiscoveries(),
    getFounderProfile(),
    discoverySuggestions(),
    sourceLanePerformance(),
  ]);
  const params = await searchParams;
  const profileContext = profileToDiscoveryContext(profile);
  const initialCapacity = profile?.builderStage === "scaling" ? "team" : "ai-assisted";
  const initialDomain = typeof params?.domain === "string" ? params.domain.slice(0, 160) : "";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Discover ideas</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Don&apos;t have an idea yet? Give a market and let surfagent scout the web for
          problems worth solving — then send the best candidate to the council.
        </p>
      </div>

      <DiscoveryForm
        initialDomain={initialDomain}
        initialCapacity={initialCapacity}
        profileContext={profileContext}
        suggestions={suggestions}
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Link href="/today" className="rounded-xl border border-zinc-200 bg-white p-4 text-sm transition hover:bg-zinc-50">
          <span className="font-semibold text-zinc-900">Idea of the day</span>
          <span className="mt-1 block text-xs text-zinc-500">Deterministic daily pick from local reports.</span>
        </Link>
        <Link href="/settings/research" className="rounded-xl border border-zinc-200 bg-white p-4 text-sm transition hover:bg-zinc-50">
          <span className="font-semibold text-zinc-900">Research lanes</span>
          <span className="mt-1 block text-xs text-zinc-500">Tune source templates without code edits.</span>
        </Link>
        <Link href="/insights" className="rounded-xl border border-zinc-200 bg-white p-4 text-sm transition hover:bg-zinc-50">
          <span className="font-semibold text-zinc-900">Market insights</span>
          <span className="mt-1 block text-xs text-zinc-500">Browse saved market reads and source confidence.</span>
        </Link>
      </div>

      {laneStats.length ? (
        <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-zinc-900">Source lane performance</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {laneStats.slice(0, 4).map((lane) => (
              <div key={lane.lane} className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600 ring-1 ring-inset ring-zinc-200">
                <div className="font-semibold text-zinc-900">{lane.lane}</div>
                <div className="mt-1">{lane.sourceCount} sources · {lane.candidateCount} candidates · {lane.averageCandidateScore}/100 avg</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

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
