"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { IdeaCandidate } from "@/lib/research/types";

const COMPARE_STORAGE_KEY = "ideaclyst-compare-v1";

type SortKey = "opportunity" | "founderFit" | "feasibility" | "whyNow" | "added";

interface CompareEntry {
  discoveryId: string;
  candidate: IdeaCandidate;
  addedAt: string;
}

const SCORE_LABELS = ["Opportunity", "Problem", "Feasibility", "Why now"] as const;

function isCompareEntry(value: unknown): value is CompareEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  const candidate = entry.candidate as Record<string, unknown> | undefined;
  if (!candidate) return false;
  return (
    typeof entry.discoveryId === "string" &&
    typeof entry.addedAt === "string" &&
    typeof candidate.id === "string" &&
    typeof candidate.title === "string"
  );
}

function readEntries(): CompareEntry[] {
  try {
    const raw = localStorage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isCompareEntry) : [];
  } catch {
    return [];
  }
}

function score(candidate: IdeaCandidate, label: string): number | undefined {
  return candidate.report?.scores.find((item) => item.label === label)?.score;
}

function sortValue(entry: CompareEntry, sort: SortKey): number {
  if (sort === "founderFit") return entry.candidate.report?.founderFit.score ?? 0;
  if (sort === "feasibility") return score(entry.candidate, "Feasibility") ?? 0;
  if (sort === "whyNow") return score(entry.candidate, "Why now") ?? 0;
  if (sort === "added") return new Date(entry.addedAt).getTime();
  return score(entry.candidate, "Opportunity") ?? entry.candidate.confidence?.overall ?? 0;
}

function ScorePill({ value }: { value?: number }) {
  return (
    <span className="inline-flex min-w-12 justify-center rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-800 ring-1 ring-inset ring-zinc-200">
      {typeof value === "number" ? `${value}/10` : "n/a"}
    </span>
  );
}

function CompactList({ items }: { items?: string[] }) {
  if (!items?.length) return <span className="text-zinc-400">No details yet</span>;
  return (
    <ul className="space-y-1">
      {items.slice(0, 3).map((item) => (
        <li key={item} className="leading-relaxed">
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function ComparePage() {
  const [entries, setEntries] = useState<CompareEntry[]>([]);
  const [sort, setSort] = useState<SortKey>("opportunity");

  useEffect(() => {
    const timer = window.setTimeout(() => setEntries(readEntries()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const sortedEntries = useMemo(
    () => entries.slice().sort((a, b) => sortValue(b, sort) - sortValue(a, sort)),
    [entries, sort],
  );

  function persist(next: CompareEntry[]) {
    setEntries(next);
    localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(next, null, 2));
  }

  function remove(discoveryId: string, candidateId: string) {
    persist(entries.filter((entry) => entry.discoveryId !== discoveryId || entry.candidate.id !== candidateId));
  }

  function clear() {
    persist([]);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Idea comparison</div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">Compare saved discovery reports</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
            Compare candidates you add from full report pages. The table keeps the evidence, scores, offer, risks, and next moves close enough to make a sharper call.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700"
            aria-label="Sort ideas"
          >
            <option value="opportunity">Sort by opportunity</option>
            <option value="founderFit">Sort by founder fit</option>
            <option value="feasibility">Sort by feasibility</option>
            <option value="whyNow">Sort by why now</option>
            <option value="added">Sort by recently added</option>
          </select>
          {entries.length ? (
            <button
              type="button"
              onClick={clear}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {!sortedEntries.length ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-zinc-900">No ideas selected yet</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-zinc-600">
            Open a discovery candidate report and choose Add to compare. IdeaClyst stores the comparison locally in this browser.
          </p>
          <Link
            href="/discover"
            className="mt-4 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
          >
            Open discovery
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SCORE_LABELS.map((label) => {
              const values = sortedEntries.map((entry) => score(entry.candidate, label)).filter((value): value is number => typeof value === "number");
              const average = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : undefined;
              return (
                <div key={label} className="rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="text-sm font-semibold text-zinc-900">{label}</div>
                  <div className="mt-2 text-2xl font-bold text-zinc-900">{average ? `${average}/10` : "n/a"}</div>
                  <div className="mt-1 text-xs text-zinc-500">Average across selected reports</div>
                </div>
              );
            })}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
            <table className="min-w-[980px] divide-y divide-zinc-200 text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="w-64 px-4 py-3 font-semibold">Idea</th>
                  <th className="px-4 py-3 font-semibold">Scores</th>
                  <th className="px-4 py-3 font-semibold">Buyer and offer</th>
                  <th className="px-4 py-3 font-semibold">Market gap</th>
                  <th className="px-4 py-3 font-semibold">Risk and next move</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {sortedEntries.map((entry) => {
                  const { candidate } = entry;
                  const report = candidate.report;
                  const coreOffer = report?.valueLadder.find((stage) => stage.stage === "core");
                  return (
                    <tr key={`${entry.discoveryId}-${candidate.id}`} className="align-top">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-zinc-900">{candidate.title}</div>
                        <p className="mt-1 text-xs leading-relaxed text-zinc-600">{report?.oneLine || candidate.idea}</p>
                        <Link
                          href={`/discover/${entry.discoveryId}/ideas/${candidate.id}`}
                          className="mt-2 inline-flex text-xs font-medium text-indigo-600 underline-offset-2 hover:underline"
                        >
                          Open full report
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <div className="grid grid-cols-2 gap-2">
                          {SCORE_LABELS.map((label) => (
                            <div key={label} className="rounded-lg bg-zinc-50 p-2 ring-1 ring-inset ring-zinc-200">
                              <div className="mb-1 text-[11px] text-zinc-500">{label}</div>
                              <ScorePill value={score(candidate, label)} />
                            </div>
                          ))}
                          <div className="rounded-lg bg-zinc-50 p-2 ring-1 ring-inset ring-zinc-200">
                            <div className="mb-1 text-[11px] text-zinc-500">Founder fit</div>
                            <ScorePill value={report?.founderFit.score} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs leading-relaxed text-zinc-600">
                        <div><span className="font-semibold text-zinc-900">Buyer:</span> {candidate.targetCustomer || report?.frameworks.categorization.target || "TBD"}</div>
                        <div className="mt-2"><span className="font-semibold text-zinc-900">Core offer:</span> {coreOffer ? `${coreOffer.offer} (${coreOffer.price})` : report?.executionPlan.initialOffer || "TBD"}</div>
                        <div className="mt-2"><span className="font-semibold text-zinc-900">GTM:</span> {report?.businessFit.goToMarket || "TBD"}</div>
                      </td>
                      <td className="px-4 py-4 text-xs text-zinc-600">
                        <CompactList items={report?.marketGap.differentiationLevers} />
                      </td>
                      <td className="px-4 py-4 text-xs leading-relaxed text-zinc-600">
                        <div><span className="font-semibold text-zinc-900">Risk:</span> {candidate.risk || report?.roast.blindSpots[0] || "Needs validation"}</div>
                        <div className="mt-2"><span className="font-semibold text-zinc-900">Next:</span> {report?.executionPlan.nextActions[0] || "Run interviews"}</div>
                        <div className="mt-2"><span className="font-semibold text-zinc-900">Roast:</span> {report?.roast.verdict || "No roast yet"}</div>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => remove(entry.discoveryId, candidate.id)}
                          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
