import Link from "next/link";

import { refreshTrendRadar } from "@/lib/trends/store";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default async function TrendsPage() {
  const radar = await refreshTrendRadar();

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Trend radar</div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">Market signal library</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
            A local radar built from discovery market reads, keyword maps, source lanes, and candidate reports. It writes `TRENDS.md` and `trends.json` under `.ideaclyst/trends/`.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/insights" className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">
            Insights
          </Link>
          <Link href="/monitors" className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">
            Monitor
          </Link>
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
            {radar.signals.length} signal{radar.signals.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {!radar.signals.length ? (
        <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-zinc-900">No trend signals yet</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-zinc-600">
            Run a discovery first. The radar will collect market terms, keyword signals, related communities, and candidate ideas from local discovery artifacts.
          </p>
          <Link href="/discover" className="mt-4 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700">
            Start discovery
          </Link>
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {radar.signals.map((signal) => (
            <article key={signal.id} className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 ring-1 ring-inset ring-zinc-200">
                      {signal.confidence} · {signal.confidenceScore}/100
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 ring-1 ring-inset ring-zinc-200">
                      {signal.sourceCount} source{signal.sourceCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-zinc-900">{signal.term}</h2>
                  <p className="mt-1 text-xs font-medium text-zinc-500">{signal.market}</p>
                </div>
                <Link
                  href={`/discover?domain=${encodeURIComponent(signal.term)}`}
                  className="shrink-0 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-zinc-700"
                >
                  Scout
                </Link>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-zinc-600">{signal.summary}</p>
              <p className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-zinc-600 ring-1 ring-inset ring-zinc-200">
                {signal.growthNote}
              </p>

              {signal.relatedCommunities.length ? (
                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Related lanes</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {signal.relatedCommunities.map((community) => (
                      <span key={community} className="rounded-full bg-zinc-50 px-2 py-0.5 text-xs text-zinc-500 ring-1 ring-inset ring-zinc-200">
                        {community}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {signal.candidateIdeas.length ? (
                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Candidate ideas</div>
                  <div className="mt-2 grid gap-2">
                    {signal.candidateIdeas.map((candidate) => (
                      <Link key={candidate.id} href={candidate.href} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50">
                        <span className="font-medium text-zinc-900">{candidate.title}</span>
                        {candidate.score !== undefined ? <span className="ml-2 text-xs text-zinc-400">{candidate.score}/100</span> : null}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {signal.sourceUrls.length ? (
                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Sources</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {signal.sourceUrls.slice(0, 4).map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" className="max-w-full truncate rounded-lg border border-zinc-200 px-2 py-1 text-xs text-indigo-600 transition hover:bg-zinc-50">
                        {url}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 text-xs text-zinc-400">
                Updated {formatDate(signal.updatedAt)}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
