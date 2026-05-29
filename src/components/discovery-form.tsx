"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const labelCls = "block text-sm font-medium text-zinc-800";
const inputCls =
  "mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function DiscoveryForm() {
  const router = useRouter();
  const [domain, setDomain] = useState("");
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
        body: JSON.stringify({ domain }),
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
          Domain or market <span className="text-rose-500">*</span>
        </label>
        <input
          id="domain"
          className={inputCls}
          placeholder="e.g. tools for indie game studios, AI for accountants, …"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          required
        />
        <p className="mt-1 text-xs text-zinc-500">
          Surfagent scouts the web for problems and launches in this space, then proposes
          candidate ideas you can send to the council.
        </p>
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
