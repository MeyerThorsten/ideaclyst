"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { IdeaCandidate } from "@/lib/research/types";

export default function CandidateCard({
  discoveryId,
  candidate,
}: {
  discoveryId: string;
  candidate: IdeaCandidate;
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
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h3 className="text-lg font-semibold text-zinc-900">{candidate.title}</h3>
      <p className="mt-1.5 text-sm text-zinc-600">{candidate.idea}</p>
      {candidate.targetCustomer ? (
        <p className="mt-2 text-xs text-zinc-500">
          <span className="font-medium text-zinc-600">Who:</span> {candidate.targetCustomer}
        </p>
      ) : null}
      {candidate.signal ? (
        <p className="mt-1 text-xs text-zinc-500">
          <span className="font-medium text-zinc-600">Signal:</span> {candidate.signal}
        </p>
      ) : null}
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

      <div className="mt-4 flex items-center gap-3">
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
