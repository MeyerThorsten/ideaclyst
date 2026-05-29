/**
 * The research seam — the only research-mode-aware module, mirroring agents/index.ts.
 *
 * `researchMode()` defaults to following IDEACLYST_AGENT_MODE (cli→live Chrome,
 * mock→offline), with an optional IDEACLYST_RESEARCH_MODE override (set to "mock"
 * to keep real agents but skip Chrome). Everything is best-effort: any failure in
 * the live path degrades to the deterministic mock with a labeled note — research
 * must never throw a council run into failure.
 */

import { Run } from "../runs/types";
import { runAgent, agentMode } from "../agents/index";
import { ensureChrome, releaseChrome } from "./chrome";
import { reconUrl } from "./recon";
import { readUrl } from "./read";
import { webSearch } from "./search";
import { marketResearchSynthesisPrompt, discoverySynthesisPrompt } from "./synthesize";
import { mockMarketResearch, mockCompetitorTeardown, mockDiscoveryCandidates } from "./mock";
import { ResearchResult, ResearchSource, IdeaCandidate, DiscoveryScoutResult } from "./types";

export type ResearchMode = "mock" | "live";

export function researchMode(): ResearchMode {
  const override = (process.env.IDEACLYST_RESEARCH_MODE || "").toLowerCase();
  if (override === "mock") return "mock";
  if (override === "live") return "live";
  return agentMode() === "cli" ? "live" : "mock";
}

function num(env: string, dflt: number): number {
  return Number(process.env[env]) || dflt;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms)),
  ]);
}

function parseCompetitorUrls(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[\s,]+/)
    .map((u) => u.trim())
    .filter(Boolean)
    .map((u) => (/^https?:\/\//i.test(u) ? u : `https://${u}`))
    .filter((u) => {
      try {
        new URL(u);
        return true;
      } catch {
        return false;
      }
    })
    .slice(0, 4);
}

function sourcesFooter(sources: ResearchSource[]): string {
  if (!sources.length) return "";
  const lines = sources.map((s) => `- [${s.title || s.url}](${s.url})`).join("\n");
  return `\n\n## Sources\n${lines}`;
}

/** Recon a single URL into a ResearchSource summary, swallowing failures. */
async function pageSource(
  url: string,
  port: number,
  host: string,
  deep: boolean,
): Promise<ResearchSource | null> {
  const perTimeout = num("IDEACLYST_RESEARCH_TIMEOUT_MS", 20_000);
  try {
    if (deep) {
      const r = await withTimeout(readUrl(url, { port, host }), perTimeout, "readUrl");
      return { url, title: r.title || url, summary: r.plainText.slice(0, 1200), kind: "page" };
    }
    const r = await withTimeout(reconUrl(url, { port, host }), perTimeout, "reconUrl");
    return {
      url: r.url || url,
      title: r.title || url,
      summary: r.contentSummary.slice(0, 1200),
      kind: "page",
    };
  } catch {
    return null;
  }
}

async function liveMarketResearch(run: Run, competitorUrls: string[]): Promise<ResearchResult> {
  const maxSources = num("IDEACLYST_RESEARCH_MAX_SOURCES", 3);
  const { port, host } = await ensureChrome();
  const notes: string[] = [];
  try {
    const query = `${run.title} ${run.idea}`.slice(0, 200);
    const results = await withTimeout(webSearch(query), num("IDEACLYST_RESEARCH_TIMEOUT_MS", 20_000), "webSearch");

    const sources: ResearchSource[] = results.map((r) => ({
      url: r.url,
      title: r.title,
      summary: r.snippet,
      kind: "serp" as const,
    }));

    // Deep-recon the top few organic results for real page content.
    const toRecon = results.slice(0, maxSources).map((r) => r.url);
    for (const url of toRecon) {
      const s = await pageSource(url, port, host, false);
      if (s) sources.push(s);
    }

    // Competitor teardown: deep-read any supplied competitor URLs.
    let teardown = "";
    if (competitorUrls.length) {
      const compSources: ResearchSource[] = [];
      for (const url of competitorUrls) {
        const s = await pageSource(url, port, host, true);
        if (s) compSources.push(s);
      }
      if (compSources.length) {
        sources.push(...compSources);
        teardown = competitorUrls.join(", ");
      } else {
        notes.push("competitor pages could not be fetched");
      }
    }

    if (!sources.length) {
      notes.push("no web results (possible anti-bot block)");
      const fb = mockMarketResearch(run, `Live research returned nothing (${notes.join("; ")}).`);
      return fb;
    }

    // Synthesize via the existing agent seam (honors agent mock/cli).
    const prompt = marketResearchSynthesisPrompt(run, sources, teardown);
    const synth = await runAgent("claude", prompt, { run, stepKey: "marketResearch" });
    const note = notes.length ? `Live research (partial: ${notes.join("; ")}).` : "Live web research.";
    return {
      ok: true,
      degraded: notes.length > 0,
      note,
      findings: `${synth.trim()}${sourcesFooter(sources)}`,
      sources,
    };
  } finally {
    releaseChrome();
  }
}

/** Market research (+ optional competitor teardown). Always resolves; never throws. */
export async function runMarketResearch(
  run: Run,
  opts: { competitorUrls?: string } = {},
): Promise<ResearchResult> {
  const competitorUrls = parseCompetitorUrls(opts.competitorUrls);

  if (researchMode() === "mock") {
    const res = mockMarketResearch(run);
    const teardown = mockCompetitorTeardown(competitorUrls);
    if (teardown) res.findings += `\n\n${teardown}`;
    return res;
  }

  try {
    return await withTimeout(
      liveMarketResearch(run, competitorUrls),
      num("IDEACLYST_RESEARCH_BUDGET_MS", 60_000),
      "research budget",
    );
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown error";
    return mockMarketResearch(run, `Live research unavailable (${reason}) — used offline synthesis.`);
  }
}

// ---- Idea Discovery scouting ----

async function liveScout(queries: string[]): Promise<DiscoveryScoutResult> {
  const maxSources = num("IDEACLYST_RESEARCH_MAX_SOURCES", 3);
  const { port, host } = await ensureChrome();
  const notes: string[] = [];
  try {
    const sources: ResearchSource[] = [];
    const seen = new Set<string>();
    for (const q of queries) {
      let results;
      try {
        results = await withTimeout(webSearch(q), num("IDEACLYST_RESEARCH_TIMEOUT_MS", 20_000), "webSearch");
      } catch {
        notes.push(`search failed: ${q}`);
        continue;
      }
      for (const r of results.slice(0, maxSources)) {
        if (seen.has(r.url)) continue;
        seen.add(r.url);
        const s = await pageSource(r.url, port, host, false);
        if (s) sources.push(s);
      }
    }
    if (!sources.length) notes.push("no sources scouted (possible anti-bot block)");
    return {
      ok: sources.length > 0,
      degraded: notes.length > 0,
      note: notes.length ? notes.join("; ") : undefined,
      sources,
    };
  } finally {
    releaseChrome();
  }
}

/**
 * Discover candidate ideas for a domain. In mock mode returns deterministic
 * candidates; in live mode scouts the web and synthesizes via the agent seam.
 * Always resolves.
 */
export async function discoverIdeas(
  domain: string,
): Promise<{ candidates: IdeaCandidate[]; sources: ResearchSource[]; degraded: boolean; note?: string }> {
  if (researchMode() === "mock") {
    return { candidates: mockDiscoveryCandidates(domain), sources: [], degraded: true, note: "Mock mode — offline candidates." };
  }

  try {
    const queries = [
      `${domain} startup ideas problems`,
      `${domain} "I wish there was" OR complaint`,
      `new ${domain} tools launch`,
    ];
    const scout = await withTimeout(
      liveScout(queries),
      num("IDEACLYST_RESEARCH_BUDGET_MS", 60_000),
      "discovery budget",
    );
    if (!scout.sources.length) {
      return { candidates: mockDiscoveryCandidates(domain), sources: [], degraded: true, note: scout.note || "No sources; offline candidates." };
    }
    const prompt = discoverySynthesisPrompt(domain, scout.sources);
    // Reuse a synthetic Run as the agent context (mock path ignores it; cli uses prompt).
    const ctxRun = { id: "discovery", title: domain, idea: domain } as unknown as Run;
    const raw = await runAgent("claude", prompt, { run: ctxRun, stepKey: "marketResearch" });
    const candidates = parseCandidates(raw, domain);
    if (!candidates.length) {
      return { candidates: mockDiscoveryCandidates(domain), sources: scout.sources, degraded: true, note: "Synthesis returned no candidates; offline candidates." };
    }
    return { candidates, sources: scout.sources, degraded: scout.degraded, note: scout.note };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown error";
    return { candidates: mockDiscoveryCandidates(domain), sources: [], degraded: true, note: `Live discovery unavailable (${reason}).` };
  }
}

function parseCandidates(raw: string, domain: string): IdeaCandidate[] {
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fence ? fence[1] : raw;
  try {
    const arr = JSON.parse(jsonText.trim()) as Array<Record<string, unknown>>;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((c) => c && typeof c.title === "string" && typeof c.idea === "string")
      .slice(0, 8)
      .map((c, i) => ({
        id: `${i + 1}-${String(c.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "idea"}`,
        title: String(c.title),
        idea: String(c.idea),
        targetCustomer: typeof c.targetCustomer === "string" ? c.targetCustomer : undefined,
        signal: typeof c.signal === "string" ? c.signal : undefined,
        sourceUrl: typeof c.sourceUrl === "string" && c.sourceUrl ? c.sourceUrl : undefined,
      }));
  } catch {
    void domain;
    return [];
  }
}
