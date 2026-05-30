"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { IdeaCandidate } from "@/lib/research/types";

const EFFORT_CLS: Record<string, string> = {
  low: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  moderate: "bg-amber-50 text-amber-700 ring-amber-200",
  high: "bg-rose-50 text-rose-700 ring-rose-200",
};
const COMMERCIAL_CLS: Record<string, string> = {
  strong: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  weak: "bg-zinc-100 text-zinc-600 ring-zinc-200",
};

function Badge({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>
      <span className="opacity-60">{label}</span> {value}
    </span>
  );
}

export default function CandidateCard({
  discoveryId,
  candidate,
  rank,
}: {
  discoveryId: string;
  candidate: IdeaCandidate;
  rank?: number;
}) {
  const router = useRouter();
  const [promoting, setPromoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function promote() {
    setPromoting(true);
    setError(null);
    try {
      const res = await fetch(`/api/discoveries/${discoveryId}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: candidate.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to promote");
      router.push(`/runs/${data.runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPromoting(false);
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex items-start gap-2">
        {rank ? (
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-zinc-900 text-xs font-bold text-white">
            {rank}
          </span>
        ) : null}
        <h3 className="text-lg font-semibold leading-snug text-zinc-900">{candidate.title}</h3>
      </div>

      <p className="mt-2 text-sm text-zinc-600">{candidate.idea}</p>

      {(candidate.buildEffort || candidate.commercial) ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {candidate.commercial ? (
            <Badge label="commercial" value={candidate.commercial} cls={COMMERCIAL_CLS[candidate.commercial] || COMMERCIAL_CLS.weak} />
          ) : null}
          {candidate.buildEffort ? (
            <Badge label="build" value={candidate.buildEffort} cls={EFFORT_CLS[candidate.buildEffort] || EFFORT_CLS.moderate} />
          ) : null}
        </div>
      ) : null}

      {candidate.confidence ? (
        <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-700">
            <span>Confidence</span>
            <span>{candidate.confidence.overall}/100</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${Math.max(0, Math.min(100, candidate.confidence.overall))}%` }}
            />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-zinc-500">
            <span>Demand {candidate.confidence.demandEvidence}/5</span>
            <span>Build {candidate.confidence.buildFit}/5</span>
            <span>Money {candidate.confidence.monetizationClarity}/5</span>
            <span>Novelty {candidate.confidence.novelty}/5</span>
          </div>
        </div>
      ) : null}

      <dl className="mt-3 space-y-1.5 text-xs text-zinc-500">
        {candidate.targetCustomer ? (
          <div><dt className="inline font-medium text-zinc-600">Who pays: </dt><dd className="inline">{candidate.targetCustomer}</dd></div>
        ) : null}
        {candidate.fit ? (
          <div><dt className="inline font-medium text-zinc-600">Fit: </dt><dd className="inline">{candidate.fit}</dd></div>
        ) : null}
        {candidate.risk ? (
          <div><dt className="inline font-medium text-zinc-600">Risk: </dt><dd className="inline">{candidate.risk}</dd></div>
        ) : null}
        {candidate.signal ? (
          <div><dt className="inline font-medium text-zinc-600">Signal: </dt><dd className="inline">{candidate.signal}</dd></div>
        ) : null}
        {candidate.killCriteria?.length ? (
          <div><dt className="inline font-medium text-zinc-600">Kill if: </dt><dd className="inline">{candidate.killCriteria[0]}</dd></div>
        ) : null}
      </dl>

      {candidate.sourceUrl ? (
        <a
          href={candidate.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs text-indigo-600 underline underline-offset-2 hover:text-indigo-500"
        >
          source ↗
        </a>
      ) : null}

      <div className="mt-4 flex items-center gap-3 pt-1">
        <button
          onClick={promote}
          disabled={promoting}
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {promoting ? "Convening…" : "Promote to council →"}
        </button>
        {error ? <span className="text-xs text-rose-600">{error}</span> : null}
      </div>
    </div>
  );
}
