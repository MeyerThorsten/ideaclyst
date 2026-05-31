"use client";

import { useState } from "react";

import {
  BUILDER_STAGES,
  CAPITAL_RANGES,
  FounderProfile,
  RISK_TOLERANCES,
  SALES_COMFORT_LEVELS,
  defaultFounderProfile,
} from "@/lib/profile/types";

const inputCls =
  "mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const labelCls = "block text-sm font-medium text-zinc-800";

const STAGE_LABELS: Record<FounderProfile["builderStage"], string> = {
  exploring: "Exploring ideas",
  validating: "Validating a wedge",
  building: "Building an MVP",
  scaling: "Scaling a product",
};

const CAPITAL_LABELS: Record<FounderProfile["capital"], string> = {
  none: "No outside budget",
  small: "Small validation budget",
  moderate: "Moderate build budget",
  significant: "Meaningful build/distribution capital",
};

function joinList(items: string[]): string {
  return items.join(", ");
}

export default function FounderProfileForm({ profile }: { profile: FounderProfile | null }) {
  const initial = profile ?? defaultFounderProfile();
  const [builderStage, setBuilderStage] = useState(initial.builderStage);
  const [weeklyHours, setWeeklyHours] = useState(String(initial.weeklyHours));
  const [riskTolerance, setRiskTolerance] = useState(initial.riskTolerance);
  const [salesComfort, setSalesComfort] = useState(initial.salesComfort);
  const [capital, setCapital] = useState(initial.capital);
  const [domainAccess, setDomainAccess] = useState(initial.domainAccess);
  const [skills, setSkills] = useState(joinList(initial.skills));
  const [preferredMarkets, setPreferredMarkets] = useState(joinList(initial.preferredMarkets));
  const [avoidedMarkets, setAvoidedMarkets] = useState(joinList(initial.avoidedMarkets));
  const [unfairAdvantages, setUnfairAdvantages] = useState(initial.unfairAdvantages);
  const [notes, setNotes] = useState(initial.notes);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          builderStage,
          weeklyHours: Number(weeklyHours),
          riskTolerance,
          salesComfort,
          capital,
          domainAccess,
          skills,
          preferredMarkets,
          avoidedMarkets,
          unfairAdvantages,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save profile");
      setMessage("Profile saved");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="builderStage" className={labelCls}>Builder stage</label>
          <select id="builderStage" className={inputCls} value={builderStage} onChange={(event) => setBuilderStage(event.target.value as FounderProfile["builderStage"])}>
            {BUILDER_STAGES.map((stage) => <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="weeklyHours" className={labelCls}>Hours per week</label>
          <input id="weeklyHours" className={inputCls} type="number" min="1" max="80" value={weeklyHours} onChange={(event) => setWeeklyHours(event.target.value)} />
        </div>
        <div>
          <label htmlFor="riskTolerance" className={labelCls}>Risk tolerance</label>
          <select id="riskTolerance" className={inputCls} value={riskTolerance} onChange={(event) => setRiskTolerance(event.target.value as FounderProfile["riskTolerance"])}>
            {RISK_TOLERANCES.map((level) => <option key={level} value={level}>{level}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="salesComfort" className={labelCls}>Sales comfort</label>
          <select id="salesComfort" className={inputCls} value={salesComfort} onChange={(event) => setSalesComfort(event.target.value as FounderProfile["salesComfort"])}>
            {SALES_COMFORT_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="capital" className={labelCls}>Capital</label>
          <select id="capital" className={inputCls} value={capital} onChange={(event) => setCapital(event.target.value as FounderProfile["capital"])}>
            {CAPITAL_RANGES.map((range) => <option key={range} value={range}>{CAPITAL_LABELS[range]}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="skills" className={labelCls}>Skills</label>
          <input id="skills" className={inputCls} value={skills} onChange={(event) => setSkills(event.target.value)} placeholder="AI, Next.js, design, sales..." />
        </div>
        <div>
          <label htmlFor="preferredMarkets" className={labelCls}>Preferred markets</label>
          <input id="preferredMarkets" className={inputCls} value={preferredMarkets} onChange={(event) => setPreferredMarkets(event.target.value)} placeholder="B2B SaaS, analytics, dev tools..." />
        </div>
        <div>
          <label htmlFor="avoidedMarkets" className={labelCls}>Markets to avoid</label>
          <input id="avoidedMarkets" className={inputCls} value={avoidedMarkets} onChange={(event) => setAvoidedMarkets(event.target.value)} placeholder="health, finance, marketplaces..." />
        </div>
        <div>
          <label htmlFor="domainAccess" className={labelCls}>Domain access</label>
          <input id="domainAccess" className={inputCls} value={domainAccess} onChange={(event) => setDomainAccess(event.target.value)} placeholder="Who you can interview or sell to" />
        </div>
      </div>

      <div>
        <label htmlFor="unfairAdvantages" className={labelCls}>Unfair advantages</label>
        <textarea id="unfairAdvantages" className={`${inputCls} min-h-24`} value={unfairAdvantages} onChange={(event) => setUnfairAdvantages(event.target.value)} placeholder="Audience, distribution, data access, credibility, relationships..." />
      </div>

      <div>
        <label htmlFor="notes" className={labelCls}>Notes</label>
        <textarea id="notes" className={`${inputCls} min-h-24`} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Any extra constraints, taste, or context the council should remember." />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving} className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60">
          {saving ? "Saving..." : "Save profile"}
        </button>
        {message ? <span className="text-sm text-zinc-500">{message}</span> : null}
      </div>
    </form>
  );
}
