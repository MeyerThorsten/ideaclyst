import Link from "next/link";

import { refreshMarketInsights } from "@/lib/insights/store";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const insights = await refreshMarketInsights();
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Insights</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">Market insight library</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
          Saved market reads grouped into underserved audiences, repeated pain, money signals, solution gaps, and source confidence.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {insights.map((insight) => (
          <section key={insight.id} className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">{insight.market}</h2>
                <p className="mt-1 text-xs text-zinc-500">{insight.sourceConfidence}/100 source confidence · {insight.sourceUrls.length} public sources</p>
              </div>
              <Link href={`/discover?domain=${encodeURIComponent(insight.market)}`} className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white">
                Scout
              </Link>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Pains</h3>
                <ul className="mt-2 space-y-1 text-sm text-zinc-600">
                  {insight.repeatedPainPoints.slice(0, 4).map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Money</h3>
                <ul className="mt-2 space-y-1 text-sm text-zinc-600">
                  {(insight.moneySignals.length ? insight.moneySignals : ["No direct money signal yet."]).map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>
            <Link href={insight.href} className="mt-4 inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-500">
              Open source discovery
            </Link>
          </section>
        ))}
      </div>
    </div>
  );
}
