/**
 * Deterministic, idea-aware research output for mock mode (and as the graceful
 * fallback when live research fails). No network. Mirrors the authorial style of
 * src/lib/agents/mock.ts so a demo reads as bespoke.
 */

import { Run } from "../runs/types";
import { slugify } from "../utils";
import { ResearchResult, IdeaCandidate, DiscoveryBrief } from "./types";

function customer(run: Run): string {
  return run.targetCustomer || "the target customer";
}

const MOCK_NOTE = "Mock mode — synthesized offline, no live web sources were fetched.";

export function mockMarketResearch(run: Run, note = MOCK_NOTE): ResearchResult {
  const findings = `## What the web suggests
A scan of the space around "${run.idea}" indicates ${customer(run)} already improvise with
spreadsheets, generic SaaS, and one or two point tools — the pain is real but under-served.

## Likely incumbents & alternatives
- A heavyweight platform that treats this as one feature among many (capable, slow to adopt).
- A cheaper niche tool that solves part of the job but misses the wedge's "first win".
- The status quo — manual process + spreadsheets — which is the true competitor.

## Demand signals
- Recurring questions and complaints in the communities where ${customer(run)} gather.
- Durable (not spiking) interest, suggesting a standing problem rather than a fad.
- Healthy adoption of adjacent tools, implying budget exists in this category.

## Implications for the council
Differentiate on speed-to-value and a ruthless wedge; assume switching cost — not
awareness — is the main barrier.

> _${note}_`;
  return { ok: false, degraded: true, note, findings, sources: [] };
}

export function mockCompetitorTeardown(urls: string[]): string {
  if (!urls.length) return "";
  const items = urls
    .map((u) => {
      let host = u;
      try {
        host = new URL(u).hostname.replace(/^www\./, "");
      } catch {}
      return `- **${host}** — positions around a broad value prop; pricing gated behind a demo/tiered plan; strong on breadth, weaker on a single fast "first win". *(mock teardown — page not fetched)*`;
    })
    .join("\n");
  return `## Competitor teardown\n${items}`;
}

export function mockMarketRead(brief: DiscoveryBrief, note = MOCK_NOTE): string {
  const d = brief.domain.trim() || "this market";
  return `**Honest read: ${d} is workable but under-served — win on focus, not breadth.**

## Demand signals
People in ${d} repeatedly improvise with spreadsheets and generic SaaS, and ask the same
"how do I…" questions — a durable problem rather than a fad.

## Competition
A few heavyweight incumbents treat this as one feature among many (capable, slow to adopt),
plus cheaper niche tools that solve only part of the job. The real competitor is the manual
status quo.

## Who pays
${brief.goal === "commercial" ? "Operators and small teams with budget when the pain maps to lost time or revenue." : "Early adopters and enthusiasts; monetization is secondary to the stated goal."}

## Outlook
For ${brief.capacity.replace("-", " ")}, a ruthless wedge with a fast "first win" is the
realistic path. Assume switching cost — not awareness — is the main barrier.

> _${note}_`;
}

export function mockDiscoveryCandidates(brief: DiscoveryBrief): IdeaCandidate[] {
  const d = brief.domain.trim() || "this market";
  const seeds: Array<Omit<IdeaCandidate, "id">> = [
    {
      title: `${d} onboarding autopilot`,
      idea: `Removes the most painful manual setup step for newcomers in ${d}, getting them to a first win in minutes.`,
      targetCustomer: `New teams adopting ${d} tooling`,
      buildEffort: "low",
      commercial: brief.goal === "commercial" ? "strong" : "medium",
      risk: "Habit change — people may tolerate the current setup pain.",
      fit: `Small surface, fast to ship — good fit for ${brief.capacity.replace("-", " ")}.`,
      signal: "Repeated 'how do I get started' threads in community forums.",
    },
    {
      title: `${d} signal digest`,
      idea: `Watches the noisy sources in ${d} and surfaces only what a busy operator must act on, daily.`,
      targetCustomer: `Operators and managers in ${d}`,
      buildEffort: "moderate",
      commercial: "medium",
      risk: "Source access / rate limits; value must beat skimming feeds manually.",
      fit: "Mostly data plumbing + a clean digest — manageable scope.",
      signal: "People manually skimming multiple feeds and complaining about overload.",
    },
    {
      title: `${d} compliance copilot`,
      idea: `Turns the recurring, error-prone checklist work in ${d} into a guided, auditable flow.`,
      targetCustomer: `Small teams in ${d} without dedicated ops`,
      buildEffort: "moderate",
      commercial: brief.goal === "commercial" ? "strong" : "weak",
      risk: "Requires trust; sales cycle longer for anything compliance-adjacent.",
      fit: "Clear willingness to pay, but needs a credible, narrow first checklist.",
      signal: "Spreadsheets-as-process and frequent 'did we miss something?' posts.",
    },
  ];
  return seeds.map((s) => ({ id: slugify(s.title), ...s }));
}
