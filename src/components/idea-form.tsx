"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { RUN_GOALS, RunGoal } from "@/lib/runs/types";

const GOAL_LABELS: Record<RunGoal, string> = {
  validate: "Validate — is this worth building?",
  plan: "Plan — turn it into a roadmap",
  build: "Build — get to an MVP spec",
  pitch: "Pitch — sharpen the story",
  refine: "Refine — improve an existing idea",
};

const labelCls = "block text-sm font-medium text-zinc-800";
const inputCls =
  "mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function IdeaForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [idea, setIdea] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [constraints, setConstraints] = useState("");
  const [preferredStack, setPreferredStack] = useState("");
  const [goal, setGoal] = useState<RunGoal>("validate");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          idea,
          targetCustomer,
          constraints,
          preferredStack,
          goal,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start session");
      }
      router.push(`/runs/${data.runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="title" className={labelCls}>
          Title <span className="text-rose-500">*</span>
        </label>
        <input
          id="title"
          className={inputCls}
          placeholder="e.g. Standup notes that write themselves"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="idea" className={labelCls}>
          The idea <span className="text-rose-500">*</span>
        </label>
        <textarea
          id="idea"
          className={`${inputCls} min-h-28 resize-y`}
          placeholder="Describe the rough idea in a few sentences. What's the pain, who has it, and what would the product do?"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="targetCustomer" className={labelCls}>
            Target customer <span className="text-zinc-400">(optional)</span>
          </label>
          <input
            id="targetCustomer"
            className={inputCls}
            placeholder="e.g. Engineering managers at 10–50 person startups"
            value={targetCustomer}
            onChange={(e) => setTargetCustomer(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="preferredStack" className={labelCls}>
            Preferred stack <span className="text-zinc-400">(optional)</span>
          </label>
          <input
            id="preferredStack"
            className={inputCls}
            placeholder="e.g. Next.js + Postgres"
            value={preferredStack}
            onChange={(e) => setPreferredStack(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label htmlFor="constraints" className={labelCls}>
          Constraints <span className="text-zinc-400">(optional)</span>
        </label>
        <input
          id="constraints"
          className={inputCls}
          placeholder="e.g. Solo founder, must ship in 6 weeks, no budget for ads"
          value={constraints}
          onChange={(e) => setConstraints(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="goal" className={labelCls}>
          Goal of this session
        </label>
        <select
          id="goal"
          className={inputCls}
          value={goal}
          onChange={(e) => setGoal(e.target.value as RunGoal)}
        >
          {RUN_GOALS.map((g) => (
            <option key={g} value={g}>
              {GOAL_LABELS[g]}
            </option>
          ))}
        </select>
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
        {submitting ? "Convening the council…" : "Convene the council"}
      </button>
    </form>
  );
}
