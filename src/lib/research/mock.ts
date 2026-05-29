/**
 * Deterministic, idea-aware research output for mock mode (and as the graceful
 * fallback when live research fails). No network. Mirrors the authorial style of
 * src/lib/agents/mock.ts so a demo reads as bespoke.
 */

import { Run } from "../runs/types";
import { slugify } from "../utils";
import { ResearchResult, IdeaCandidate } from "./types";

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

export function mockDiscoveryCandidates(domain: string): IdeaCandidate[] {
  const d = domain.trim() || "this market";
  const seeds: Array<{ title: string; idea: string; customer: string; signal: string }> = [
    {
      title: `${d} onboarding autopilot`,
      idea: `A tool that removes the most painful manual setup step for newcomers in ${d}, getting them to a first win in minutes.`,
      customer: `New teams adopting ${d} tooling`,
      signal: "Repeated 'how do I get started' threads in community forums.",
    },
    {
      title: `${d} signal digest`,
      idea: `A daily digest that watches the noisy sources in ${d} and surfaces only what a busy operator must act on.`,
      customer: `Operators and managers in ${d}`,
      signal: "People manually skimming multiple feeds and complaining about overload.",
    },
    {
      title: `${d} compliance copilot`,
      idea: `An assistant that turns the recurring, error-prone checklist work in ${d} into a guided, auditable flow.`,
      customer: `Small teams in ${d} without dedicated ops`,
      signal: "Spreadsheets-as-process and frequent 'did we miss something?' posts.",
    },
  ];
  return seeds.map((s) => ({
    id: slugify(s.title),
    title: s.title,
    idea: s.idea,
    targetCustomer: s.customer,
    signal: s.signal,
  }));
}
