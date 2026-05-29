"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  DISCOVERY_GOALS,
  DISCOVERY_CAPACITIES,
  DiscoveryGoal,
  DiscoveryCapacity,
} from "@/lib/discovery/types";

const GOAL_LABELS: Record<DiscoveryGoal, string> = {
  commercial: "Commercial product — something people pay for",
  portfolio: "Portfolio / showcase — demonstrate skill",
  learning: "Learning / experiment — explore the tech",
  personal: "Personal — scratch your own itch",
};

const CAPACITY_LABELS: Record<DiscoveryCapacity, string> = {
  "solo-pro": "Solo, experienced — I can build it myself",
  "solo-learning": "Solo, learning — new to the stack",
  team: "Small team — designer / other devs",
  "ai-assisted": "Directing AI — I'll drive with AI assistance",
};

const labelCls = "block text-sm font-medium text-zinc-800";
const inputCls =
  "mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function DiscoveryForm() {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [goal, setGoal] = useState<DiscoveryGoal>("commercial");
  const [capacity, setCapacity] = useState<DiscoveryCapacity>("ai-assisted");
  const [constraints, setConstraints] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/discoveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, goal, capacity, constraints }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start discovery");
      router.push(`/discover/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="domain" className={labelCls}>
          Market or space <span className="text-rose-500">*</span>
        </label>
        <input
          id="domain"
          className={inputCls}
          placeholder="e.g. visionOS apps, tools for indie game studios, AI for accountants…"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          required
        />
        <p className="mt-1 text-xs text-zinc-500">
          The space to hunt in — IdeaClyst scouts the real web here for problems worth solving.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="goal" className={labelCls}>
            Your goal
          </label>
          <select
            id="goal"
            className={inputCls}
            value={goal}
            onChange={(e) => setGoal(e.target.value as DiscoveryGoal)}
          >
            {DISCOVERY_GOALS.map((g) => (
              <option key={g} value={g}>
                {GOAL_LABELS[g]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="capacity" className={labelCls}>
            Build capacity
          </label>
          <select
            id="capacity"
            className={inputCls}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value as DiscoveryCapacity)}
          >
            {DISCOVERY_CAPACITIES.map((c) => (
              <option key={c} value={c}>
                {CAPACITY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="constraints" className={labelCls}>
          Constraints / notes <span className="text-zinc-400">(optional)</span>
        </label>
        <input
          id="constraints"
          className={inputCls}
          placeholder="e.g. must ship in 6 weeks, no budget for ads, I own a Vision Pro"
          value={constraints}
          onChange={(e) => setConstraints(e.target.value)}
        />
      </div>

      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Scouting…" : "Scout for ideas"}
      </button>
    </form>
  );
}
