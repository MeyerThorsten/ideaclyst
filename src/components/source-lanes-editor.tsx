"use client";

import { useState } from "react";

import { SourceLaneTemplate } from "@/lib/research/source-lanes";

export default function SourceLanesEditor({ initialLanes }: { initialLanes: SourceLaneTemplate[] }) {
  const [lanes, setLanes] = useState(initialLanes);
  const [notice, setNotice] = useState<string | null>(null);

  function update(id: string, patch: Partial<SourceLaneTemplate>) {
    setLanes((current) => current.map((lane) => lane.id === id ? { ...lane, ...patch } : lane));
  }

  async function save() {
    setNotice(null);
    const res = await fetch("/api/research/source-lanes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lanes }),
    });
    const data = await res.json();
    if (res.ok) {
      setLanes(data.lanes);
      setNotice("Source lanes saved locally");
    } else {
      setNotice(data.error || "Save failed");
    }
  }

  return (
    <div className="space-y-3">
      {lanes.map((lane) => (
        <section key={lane.id} className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">{lane.label}</h2>
              <p className="mt-1 text-xs text-zinc-500">{lane.sourceType} · {lane.riskLabel} risk</p>
            </div>
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-600">
              <input type="checkbox" checked={lane.enabled} onChange={(event) => update(lane.id, { enabled: event.target.checked })} />
              Enabled
            </label>
          </div>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Query template
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm normal-case tracking-normal text-zinc-900"
              value={lane.queryTemplate}
              onChange={(event) => update(lane.id, { queryTemplate: event.target.value })}
            />
          </label>
          <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Cap
            <input
              type="number"
              min={1}
              max={8}
              className="mt-1 w-24 rounded-lg border border-zinc-300 px-3 py-2 text-sm normal-case tracking-normal text-zinc-900"
              value={lane.cap}
              onChange={(event) => update(lane.id, { cap: Number(event.target.value) })}
            />
          </label>
        </section>
      ))}
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700">
          Save lanes
        </button>
        {notice ? <span className="text-sm text-zinc-500">{notice}</span> : null}
      </div>
    </div>
  );
}
