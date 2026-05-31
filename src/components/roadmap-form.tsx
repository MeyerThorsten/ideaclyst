"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ProjectSummary {
  id: string;
  name: string;
  itemCount: number;
  doneCount: number;
  openCount: number;
}

const labelCls = "block text-sm font-medium text-zinc-800";
const inputCls =
  "mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export function RoadmapForm() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectId, setProjectId] = useState("");
  const [perKind, setPerKind] = useState(2);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/roadmap")
      .then((r) => r.json())
      .then((d: { projects: ProjectSummary[] }) => {
        setProjects(d.projects);
        if (d.projects[0]) setProjectId(d.projects[0].id);
      })
      .catch(() => setError("Could not load projects. Check Settings."))
      .finally(() => setLoading(false));
  }, []);

  async function submit() {
    if (!projectId) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId, perKind }),
      });
      const d = (await r.json()) as { id?: string; error?: string };
      if (d.id) router.push(`/roadmap/${d.id}`);
      else setError(d.error ?? "Failed to start analysis.");
    } catch {
      setError("Failed to start analysis.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading projects…</p>;
  if (projects.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        No Threlmark projects found. Open{" "}
        <a className="font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-500" href="/settings">
          Settings
        </a>{" "}
        to configure the source.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="projectId" className={labelCls}>
          Project
        </label>
        <select
          id="projectId"
          className={inputCls}
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.itemCount} items ({p.doneCount} done)
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="perKind" className={labelCls}>
          Suggestions per kind:{" "}
          <span className="font-semibold text-indigo-700">{perKind}</span>
        </label>
        <input
          id="perKind"
          type="range"
          min={2}
          max={6}
          step={2}
          value={perKind}
          onChange={(e) => setPerKind(Number(e.target.value))}
          className="mt-1.5 w-full"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Generates {perKind} features, {perKind} spin-offs, {perKind} services ({perKind * 3} total).
        </p>
      </div>

      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
          {error}
        </p>
      ) : null}

      <button
        onClick={submit}
        disabled={submitting || !projectId}
        className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Starting…" : "Analyze roadmap"}
      </button>
    </div>
  );
}
