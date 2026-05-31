"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import AppShell from "@/components/app-shell";
import { SuggestionCard } from "@/components/suggestion-card";

const POLL_MS = 1500;

interface Suggestion {
  id: string;
  kind: "feature" | "spinoff" | "service";
  title: string;
  description: string;
  category: string;
  impact: number;
  evidence: number;
  fit: number;
  effort: number;
  acceptance: string[];
  rationale: string;
  sources: { title: string; url: string }[];
  sentSuggestionId?: string;
}
interface Lane {
  notes: string;
  suggestions: Suggestion[];
}
interface Analysis {
  id: string;
  projectId: string;
  projectName: string;
  perKind: number;
  status: "queued" | "running" | "completed" | "failed";
  currentStep?: string;
  error?: string;
  gapSummary: string;
  lanes: { feature: Lane; spinoff: Lane; service: Lane };
}

const LANE_LABELS: Record<keyof Analysis["lanes"], string> = {
  feature: "Features",
  spinoff: "Spin-offs",
  service: "Services",
};

export default function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState("");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const r = await fetch(`/api/roadmap/${id}`, { cache: "no-store" });
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.error ?? `Failed to load analysis (${r.status})`);
        }
        const d = (await r.json()) as { analysis: Analysis };
        if (cancelled) return;
        setAnalysis(d.analysis);
        setError(null);
        if (d.analysis.status === "queued" || d.analysis.status === "running") {
          timer = setTimeout(poll, POLL_MS);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load analysis");
        timer = setTimeout(poll, POLL_MS * 2);
      }
    }

    poll();
    fetch("/api/roadmap")
      .then((r) => r.json())
      .then((d: { projects: { id: string; name: string }[] }) => setProjects(d.projects))
      .catch(() => {});

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  const laneKeys = useMemo(() => ["feature", "spinoff", "service"] as (keyof Analysis["lanes"])[], []);

  function toggle(sid: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  }

  async function send() {
    if (checked.size === 0) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/roadmap/${id}/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ suggestionIds: [...checked], targetProjectId: target || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        sent?: { id: string }[];
        failed?: { id: string; error: string }[];
        error?: string;
      };
      if (!res.ok) {
        // Keep the selection so the user can retry. Surface partial-failure detail.
        const sentCount = data.sent?.length ?? 0;
        const failedCount = data.failed?.length ?? 0;
        setError(
          failedCount > 0
            ? `${sentCount} sent, ${failedCount} failed.`
            : data.error ?? `Send failed (${res.status})`,
        );
        return;
      }
      const failedCount = data.failed?.length ?? 0;
      if (failedCount > 0) {
        setError(`${data.sent?.length ?? 0} sent, ${failedCount} failed.`);
      }
      setChecked(new Set());
      // Refresh once to pick up sentSuggestionId fields.
      const r = await fetch(`/api/roadmap/${id}`, { cache: "no-store" });
      if (r.ok) {
        const d = (await r.json()) as { analysis: Analysis };
        setAnalysis(d.analysis);
      }
    } catch {
      setError("Send failed. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  if (error && !analysis) {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl py-8">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            {error}
            <div className="mt-3">
              <Link href="/roadmap" className="font-medium underline">
                ← Back to roadmap
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!analysis) {
    return (
      <AppShell>
        <div className="py-8 text-sm text-zinc-500">Loading analysis…</div>
      </AppShell>
    );
  }

  const inProgress = analysis.status === "queued" || analysis.status === "running";

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl py-8">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Roadmap intelligence — {analysis.projectName}
        </h1>
        {analysis.gapSummary ? (
          <p className="mt-1 text-sm text-zinc-500">{analysis.gapSummary}</p>
        ) : null}

        {inProgress ? (
          <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-indigo-800">
              <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
              {analysis.currentStep ?? "Working"}…
            </div>
          </div>
        ) : null}

        {analysis.status === "failed" ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span className="font-semibold">Failed:</span> {analysis.error}
          </div>
        ) : null}

        {/* Sticky send toolbar */}
        <div className="sticky top-0 z-10 mt-4 flex flex-wrap items-center gap-3 border-b border-zinc-200 bg-white/90 py-3 backdrop-blur">
          <span className="text-sm text-zinc-500">
            {checked.size} selected
          </span>
          <label className="text-sm text-zinc-700">Target project:</label>
          <select
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            <option value="">{analysis.projectName} (this project)</option>
            {projects
              .filter((p) => p.id !== analysis.projectId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
          <button
            onClick={send}
            disabled={sending || checked.size === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sending ? "Sending…" : "Send to Threlmark"}
          </button>
          {error && analysis ? <span className="text-sm text-rose-600">{error}</span> : null}
        </div>

        {/* Three-column lane grid */}
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {laneKeys.map((k) => {
            const lane = analysis.lanes[k];
            return (
              <div key={k} className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                  {LANE_LABELS[k]}
                </h2>
                {lane.notes && lane.suggestions.length === 0 ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {lane.notes}
                  </p>
                ) : null}
                {lane.suggestions.map((s) => (
                  <SuggestionCard key={s.id} s={s} checked={checked.has(s.id)} onToggle={toggle} />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
