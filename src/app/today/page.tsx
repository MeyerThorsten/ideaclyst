import Link from "next/link";

import { ideaOfTheDay } from "@/lib/discovery/today";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const ref = await ideaOfTheDay();
  if (!ref) {
    return (
      <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Idea of the day</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-zinc-600">
          No local candidate reports exist yet. Run a discovery first and this page will pick a deterministic daily idea from your real local data.
        </p>
        <Link href="/discover" className="mt-4 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
          Start discovery
        </Link>
      </section>
    );
  }

  const score = ref.candidate.confidence?.overall;
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Today</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">Local idea of the day</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
          A deterministic daily pick from saved discoveries. No network call is required; it uses report evidence already on disk.
        </p>
      </div>
      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-zinc-500">{ref.discovery.domain}</div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">{ref.candidate.title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-600">{ref.report.oneLine}</p>
          </div>
          {score ? <div className="rounded-xl bg-zinc-900 px-4 py-3 text-lg font-bold text-white">{score}/100</div> : null}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Link href={ref.href} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm font-semibold text-zinc-900 transition hover:bg-white">
            View report
            <span className="mt-1 block text-xs font-normal text-zinc-500">Open the full report and roast.</span>
          </Link>
          <Link href={`/discover/${ref.discovery.id}/ideas/${ref.candidate.id}/funnel`} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm font-semibold text-zinc-900 transition hover:bg-white">
            Build funnel
            <span className="mt-1 block text-xs font-normal text-zinc-500">Draft the first validation path.</span>
          </Link>
          <Link href={`/projects/${ref.discovery.id}/${ref.candidate.id}`} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm font-semibold text-zinc-900 transition hover:bg-white">
            Open project
            <span className="mt-1 block text-xs font-normal text-zinc-500">PRD, tasks, and handoff queue.</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
