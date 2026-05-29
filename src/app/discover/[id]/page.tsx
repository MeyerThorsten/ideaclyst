"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

import { Discovery } from "@/lib/discovery/types";
import StatusPill from "@/components/status-pill";
import CandidateCard from "@/components/candidate-card";

const POLL_MS = 1500;

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
        {discovery.scoutNotes ? (
          <p className="mt-2 max-w-2xl text-sm text-zinc-500">{discovery.scoutNotes}</p>
        ) : null}
      </div>

      {inProgress ? (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-5 text-sm font-medium text-indigo-800">
          <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-500 align-middle" />
          {discovery.currentStep || "Scouting the web for ideas…"}
        </div>
      ) : null}

      {discovery.status === "failed" ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          <p className="font-semibold">Discovery failed.</p>
          <p className="mt-1">{discovery.error || "Unknown error."}</p>
        </div>
      ) : null}

      {discovery.candidates.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {discovery.candidates.map((c) => (
            <CandidateCard key={c.id} discoveryId={discovery.id} candidate={c} />
          ))}
        </div>
      ) : !inProgress ? (
        <div className="text-sm text-zinc-500">No candidates surfaced. Try a broader market.</div>
      ) : null}
    </div>
  );
}
