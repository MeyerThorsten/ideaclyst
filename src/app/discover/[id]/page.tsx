"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

import { Discovery } from "@/lib/discovery/types";
import StatusPill from "@/components/status-pill";
import CandidateCard from "@/components/candidate-card";
import { renderMarkdown } from "@/lib/utils";

const POLL_MS = 1500;

const STEP_FLOW = ["Scouting the market", "Reading the market", "Proposing ideas"];

const GOAL_LABELS: Record<string, string> = {
  commercial: "Commercial",
  portfolio: "Portfolio",
  learning: "Learning",
  personal: "Personal",
};
const CAPACITY_LABELS: Record<string, string> = {
  "solo-pro": "Solo (experienced)",
  "solo-learning": "Solo (learning)",
  team: "Small team",
  "ai-assisted": "AI-assisted",
};

export default function DiscoveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [discovery, setDiscovery] = useState<Discovery | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const res = await fetch(`/api/discoveries/${id}`, { cache: "no-store" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed to load discovery (${res.status})`);
        }
        const data = (await res.json()) as { discovery: Discovery };
        if (cancelled) return;
        setDiscovery(data.discovery);
        setError(null);
        if (data.discovery.status === "queued" || data.discovery.status === "running") {
          timer = setTimeout(poll, POLL_MS);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load discovery");
        timer = setTimeout(poll, POLL_MS * 2);
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  if (error && !discovery) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        {error}
        <div className="mt-3">
          <Link href="/discover" className="font-medium underline">
            ← Back to discover
          </Link>
        </div>
      </div>
    );
  }

  if (!discovery) {
    return <div className="text-sm text-zinc-500">Loading discovery…</div>;
  }

  const inProgress = discovery.status === "queued" || discovery.status === "running";
  const currentIndex = discovery.currentStep ? STEP_FLOW.indexOf(discovery.currentStep) : -1;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/discover" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Discover
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{discovery.domain}</h1>
          <StatusPill status={discovery.status} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-600">
            {GOAL_LABELS[discovery.goal] || discovery.goal}
          </span>
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-600">
            {CAPACITY_LABELS[discovery.capacity] || discovery.capacity}
          </span>
          {discovery.constraints ? <span>· {discovery.constraints}</span> : null}
        </div>
      </div>

      {inProgress ? (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-indigo-800">
            <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
            {discovery.currentStep || "Working…"}
          </div>
          <ol className="mt-3 space-y-1.5 text-sm">
            {STEP_FLOW.map((step, i) => {
              const done = currentIndex === -1 ? false : i < currentIndex;
              const active = i === currentIndex;
              return (
                <li
                  key={step}
                  className={`flex items-center gap-2 ${
                    active ? "font-medium text-indigo-700" : done ? "text-zinc-500" : "text-zinc-400"
                  }`}
                >
                  <span>{done ? "✓" : active ? "▸" : "○"}</span>
                  {step}
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}

      {discovery.status === "failed" ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          <p className="font-semibold">Discovery failed.</p>
          <p className="mt-1">{discovery.error || "Unknown error."}</p>
        </div>
      ) : null}

      {discovery.marketRead ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Market read
          </h2>
          <article
            className="max-w-none text-[15px]"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(discovery.marketRead) }}
          />
          {discovery.scoutNotes ? (
            <p className="mt-3 border-t border-zinc-100 pt-3 text-xs text-zinc-400">
              {discovery.scoutNotes}
            </p>
          ) : null}
        </section>
      ) : null}

      {discovery.opportunityMap ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Opportunity map
          </h2>
          <article
            className="max-w-none text-[15px]"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(discovery.opportunityMap) }}
          />
        </section>
      ) : null}

      {discovery.candidates.length > 0 ? (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Candidate ideas <span className="text-zinc-400">(ranked, best fit first)</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {discovery.candidates.map((c, i) => (
              <CandidateCard key={c.id} discoveryId={discovery.id} candidate={c} rank={i + 1} />
            ))}
          </div>
        </div>
      ) : !inProgress ? (
        <div className="text-sm text-zinc-500">No candidates surfaced. Try a broader market.</div>
      ) : null}
    </div>
  );
}
