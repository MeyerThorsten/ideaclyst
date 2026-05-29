"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

import { Run } from "@/lib/runs/types";
import StatusPill from "@/components/status-pill";
import ResultTabs from "@/components/result-tabs";

const POLL_MS = 1500;

const STEP_FLOW = [
  "Market research",
  "Product strategy",
  "Technical architecture",
  "Claude critiques the architecture",
  "Codex critiques the strategy",
  "Final synthesis",
];

export default function RunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = use(params);
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const res = await fetch(`/api/runs/${runId}`, { cache: "no-store" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed to load run (${res.status})`);
        }
        const data = (await res.json()) as { run: Run };
        if (cancelled) return;
        setRun(data.run);
        setError(null);
        if (data.run.status === "queued" || data.run.status === "running") {
          timer = setTimeout(poll, POLL_MS);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load run");
        timer = setTimeout(poll, POLL_MS * 2);
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [runId]);

  if (error && !run) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        {error}
        <div className="mt-3">
          <Link href="/runs" className="font-medium underline">
            ← Back to sessions
          </Link>
        </div>
      </div>
    );
  }

  if (!run) {
    return <div className="text-sm text-zinc-500">Loading session…</div>;
  }

  const inProgress = run.status === "queued" || run.status === "running";
  const currentIndex = run.currentStep ? STEP_FLOW.indexOf(run.currentStep) : -1;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/runs" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Sessions
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            {run.title}
          </h1>
          <StatusPill status={run.status} />
        </div>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">{run.idea}</p>
        <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-600 capitalize">
            {run.goal}
          </span>
          {run.targetCustomer ? <span>· {run.targetCustomer}</span> : null}
        </div>
      </div>

      {inProgress ? (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-indigo-800">
            <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
            The council is deliberating…
          </div>
          <ol className="mt-3 space-y-1.5 text-sm">
            {STEP_FLOW.map((step, i) => {
              const done = currentIndex === -1 ? false : i < currentIndex;
              const active = i === currentIndex;
              return (
                <li
                  key={step}
                  className={`flex items-center gap-2 ${
                    active
                      ? "font-medium text-indigo-700"
                      : done
                        ? "text-zinc-500"
                        : "text-zinc-400"
                  }`}
                >
                  <span>
                    {done ? "✓" : active ? "▸" : "○"}
                  </span>
                  {step}
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}

      {run.status === "failed" ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          <p className="font-semibold">The council run failed.</p>
          <p className="mt-1">{run.error || "Unknown error."}</p>
          <p className="mt-2 text-rose-600">
            Tip: in CLI mode this usually means a CLI isn’t installed or logged in.
            Set <code className="rounded bg-rose-100 px-1">IDEACLYST_AGENT_MODE=mock</code> to
            use mock outputs.
          </p>
        </div>
      ) : null}

      <ResultTabs run={run} />
    </div>
  );
}
