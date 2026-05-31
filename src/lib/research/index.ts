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
import { isSafePublicUrl } from "./url-safety";
import { listSourceLanes, renderLaneQuery } from "./source-lanes";
import { marketResearchSynthesisPrompt, marketReadPrompt, candidatesPrompt } from "./synthesize";
import {
  buildDiscoveryOpportunityMap,
  buildResearchToolkit,
  mockSourcesForRun,
  scoreCandidates,
} from "./artifacts";
import {
  mockMarketResearch,
  mockCompetitorTeardown,
  mockMarketRead,
  mockDiscoveryCandidates,
} from "./mock";
import {
  ResearchResult,
  ResearchSource,
  IdeaCandidate,
  DiscoveryScoutResult,
  DiscoveryBrief,
  EffortLevel,
  CommercialStrength,
  ResearchSourceType,
} from "./types";

export type ResearchMode = "mock" | "live";

export function researchMode(): ResearchMode {
  const override = (process.env.IDEACLYST_RESEARCH_MODE || "").toLowerCase();
  if (override === "mock") return "mock";
  if (override === "live") return "live";
  return agentMode() === "cli" ? "live" : "mock";
}

/**
 * Strict mode: when on, the research layer NEVER shows fabricated/offline ("mock")
 * content — if live data can't be gathered it surfaces a clear notice instead.
 * Use it when you only want real data and would rather see "no data" than a mock.
 */
export function strictResearch(): boolean {
  const v = (process.env.IDEACLYST_RESEARCH_STRICT || "").toLowerCase();
  return v === "1" || v === "true" || v === "on";
}

const STRICT_MOCK_NOTICE =
  "_⚠️ Research is in **mock mode**, so no real data was gathered. Set `IDEACLYST_AGENT_MODE=cli` " +
  "(or `IDEACLYST_RESEARCH_MODE=live`) and make sure Chrome is installed, then re-run. " +
  "Strict mode is on, so no offline analysis is shown._";

const STRICT_EMPTY_NOTICE =
  "_⚠️ Live research returned **no web sources** (possible anti-bot block or network issue). " +
  "Retry in a moment — strict mode is on, so no offline/mock analysis is shown._";

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
    // SSRF guard: only allow public http(s) targets (drops localhost/private/metadata).
    .filter((u) => isSafePublicUrl(u))
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
  sourceType: ResearchSourceType = "search",
  sourceName = "Search result",
): Promise<ResearchSource | null> {
  const perTimeout = num("IDEACLYST_RESEARCH_TIMEOUT_MS", 20_000);
  try {
    if (deep) {
      const r = await withTimeout(readUrl(url, { port, host }), perTimeout, "readUrl");
      return {
        url,
        title: r.title || url,
        summary: r.plainText.slice(0, 1200),
        kind: "page",
        sourceType,
        sourceName,
      };
    }
    const r = await withTimeout(reconUrl(url, { port, host }), perTimeout, "reconUrl");
    return {
      url: r.url || url,
      title: r.title || url,
      summary: r.contentSummary.slice(0, 1200),
      kind: "page",
      sourceType,
      sourceName,
    };
  } catch {
    return null;
  }
}

function withToolkit(run: Run, result: ResearchResult, competitorUrls: string[]): ResearchResult {
  // Strict mode: never fabricate a toolkit from mock sources when no real sources exist.
  if (strictResearch() && result.sources.length === 0) {
    return { ...result, toolkit: undefined };
  }
  const sources = result.sources.length ? result.sources : mockSourcesForRun(run, competitorUrls);
  const toolkit = buildResearchToolkit(run, sources, {
    competitorUrls,
    note: result.note,
    findings: result.findings,
  });
  return { ...result, sources, toolkit };
}

async function liveMarketResearch(
  run: Run,
  competitorUrls: string[],
  deadline: number,
): Promise<ResearchResult> {
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
      sourceType: "search" as const,
      sourceName: "General web search",
    }));

    // Deep-recon the top few organic results — stop early if the budget is spent.
    const toRecon = results.slice(0, maxSources).map((r) => r.url);
    for (const url of toRecon) {
      if (Date.now() > deadline) {
        notes.push("budget reached during recon");
        break;
      }
      const s = await pageSource(url, port, host, false, "search", "General web recon");
      if (s) sources.push(s);
    }

    // Competitor teardown: deep-read any supplied competitor URLs.
    let teardown = "";
    if (competitorUrls.length && Date.now() <= deadline) {
      const compSources: ResearchSource[] = [];
      for (const url of competitorUrls) {
        if (Date.now() > deadline) break;
        const s = await pageSource(url, port, host, true, "competitor", "Founder supplied competitor");
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
      if (strictResearch()) {
        return { ok: false, degraded: true, note: notes.join("; "), findings: STRICT_EMPTY_NOTICE, sources: [] };
      }
      return mockMarketResearch(run, `Live research returned nothing (${notes.join("; ")}).`);
    }

    // If the budget is already spent, return the gathered sources without paying
    // for a synthesis call (keeps the step bounded and avoids orphaned work).
    if (Date.now() > deadline) {
      notes.push("budget reached before synthesis");
      if (strictResearch()) {
        // Real sources gathered — show them, but don't fabricate a synthesized memo.
        return {
          ok: true,
          degraded: true,
          note: `Live research (partial: ${notes.join("; ")}).`,
          findings: `_Synthesis skipped (research budget reached). Gathered sources below._${sourcesFooter(sources)}`,
          sources,
        };
      }
      const fb = mockMarketResearch(run, `Live research (partial: ${notes.join("; ")}).`);
      return { ...fb, findings: `${fb.findings}${sourcesFooter(sources)}`, sources };
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
    if (strictResearch()) {
      return { ok: false, degraded: true, note: "Strict mode: research is in mock mode.", findings: STRICT_MOCK_NOTICE, sources: [] };
    }
    const res = mockMarketResearch(run);
    const teardown = mockCompetitorTeardown(competitorUrls);
    if (teardown) res.findings += `\n\n${teardown}`;
    res.sources = mockSourcesForRun(run, competitorUrls);
    return withToolkit(run, res, competitorUrls);
  }

  try {
    // The budget is a deadline the live pipeline self-enforces (rather than a
    // race that abandons in-flight work) so Chrome is always released and no
    // promise keeps running unobserved after we return.
    const deadline = Date.now() + num("IDEACLYST_RESEARCH_BUDGET_MS", 60_000);
    return withToolkit(run, await liveMarketResearch(run, competitorUrls, deadline), competitorUrls);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown error";
    if (strictResearch()) {
      return { ok: false, degraded: true, note: `Live research unavailable (${reason}).`, findings: STRICT_EMPTY_NOTICE, sources: [] };
    }
    const res = mockMarketResearch(run, `Live research unavailable (${reason}) — used offline synthesis.`);
    res.sources = mockSourcesForRun(run, competitorUrls);
    return withToolkit(run, res, competitorUrls);
  }
}

// ---- Idea Discovery scouting ----

interface DiscoveryQuery {
  query: string;
  sourceName: string;
  sourceType: ResearchSourceType;
  cap?: number;
}

async function liveScout(queries: DiscoveryQuery[], deadline: number): Promise<DiscoveryScoutResult> {
  const maxSources = num("IDEACLYST_RESEARCH_MAX_SOURCES", 3);
  const { port, host } = await ensureChrome();
  const notes: string[] = [];
  try {
    const sources: ResearchSource[] = [];
    const seen = new Set<string>();
    for (const q of queries) {
      if (Date.now() > deadline) {
        notes.push("budget reached during scouting");
        break;
      }
      let results;
      try {
        results = await withTimeout(
          webSearch(q.query),
          num("IDEACLYST_RESEARCH_TIMEOUT_MS", 20_000),
          "webSearch",
        );
      } catch {
        notes.push(`search failed: ${q.sourceName}`);
        continue;
      }
      for (const r of results.slice(0, q.cap ?? maxSources)) {
        if (Date.now() > deadline) break;
        if (seen.has(r.url)) continue;
        seen.add(r.url);
        sources.push({
          url: r.url,
          title: r.title,
          summary: r.snippet,
          kind: "serp",
          sourceType: q.sourceType,
          sourceName: q.sourceName,
        });
        const s = await pageSource(r.url, port, host, false, q.sourceType, q.sourceName);
        if (s) sources.push(s);
      }
    }
    if (!sources.length) notes.push("no sources scouted (possible anti-bot block)");
    return {
      ok: sources.length > 0,
      degraded: notes.length > 0,
      note: notes.length ? notes.join("; ") : undefined,
      sources,
      timeline: buildResearchToolkit(
        {
          id: "discovery",
          title: "Discovery scouting",
          idea: queries.map((q) => q.query).join(" "),
          goal: "validate",
          status: "running",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          outputs: {
            researchFindings: "",
            researchToolkit: "",
            founderBrief: "",
            evolutionDiff: "",
            productStrategy: "",
            technicalArchitecture: "",
            claudeCritique: "",
            codexCritique: "",
            finalPlan: "",
            summary: "",
            mvpBacklog: "",
            risks: "",
            validationTests: "",
            prd: "",
            nextPrompts: "",
            transcript: "",
          },
        },
        sources,
        { note: notes.join("; ") },
      ).timeline,
    };
  } finally {
    releaseChrome();
  }
}

async function discoveryQueries(brief: DiscoveryBrief): Promise<DiscoveryQuery[]> {
  const d = brief.domain;
  const configured = await listSourceLanes();
  const enabled = configured.filter((lane) => lane.enabled);
  if (enabled.length) {
    const q: DiscoveryQuery[] = enabled.map((lane) => ({
      query: renderLaneQuery(lane, d),
      sourceName: lane.label,
      sourceType: lane.sourceType,
      cap: lane.cap,
    }));
    if (brief.goal === "commercial" && !q.some((item) => item.sourceType === "review" || item.sourceType === "pricing")) {
      q.push({
        query: `${d} pricing reviews alternatives market demand`,
        sourceName: "Commercial review and pricing scan",
        sourceType: "review",
      });
    }
    return q;
  }

  const q: DiscoveryQuery[] = [
    {
      query: `${d} problems people complain about`,
      sourceName: "General pain search",
      sourceType: "search",
    },
    {
      query: `site:news.ycombinator.com ${d} problem OR frustrating OR "wish there was"`,
      sourceName: "Hacker News pain scan",
      sourceType: "forum",
    },
    {
      query: `site:reddit.com ${d} "how do I" OR "I wish" OR frustrating`,
      sourceName: "Reddit workaround scan",
      sourceType: "forum",
    },
    {
      query: `site:producthunt.com ${d} launch app tool`,
      sourceName: "Product Hunt launch scan",
      sourceType: "launch",
    },
    {
      query: `site:github.com ${d} tool library template`,
      sourceName: "GitHub ecosystem scan",
      sourceType: "code",
    },
    {
      query: `new ${d} apps launch ${brief.goal === "commercial" ? "revenue market" : ""}`.trim(),
      sourceName: "Commercial launch search",
      sourceType: "launch",
    },
  ];
  if (brief.goal === "commercial") {
    q.push({
      query: `${d} pricing reviews alternatives market demand`,
      sourceName: "Commercial review and pricing scan",
      sourceType: "review",
    });
  }
  return q;
}

/** Stage 1 — scout the web for the brief (mock → empty; live → real sources). */
export async function scoutMarket(brief: DiscoveryBrief): Promise<DiscoveryScoutResult> {
  if (researchMode() === "mock") {
    if (strictResearch()) {
      return { ok: false, degraded: true, note: "Strict mode: research is in mock mode.", sources: [] };
    }
    const sources = mockSourcesForRun(
      {
        id: "discovery",
        title: brief.domain,
        idea: brief.domain,
        targetCustomer: brief.constraints,
        goal: "validate",
        status: "running",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        outputs: {
          researchFindings: "",
          researchToolkit: "",
          founderBrief: "",
          evolutionDiff: "",
          productStrategy: "",
          technicalArchitecture: "",
          claudeCritique: "",
          codexCritique: "",
          finalPlan: "",
          summary: "",
          mvpBacklog: "",
          risks: "",
          validationTests: "",
          prd: "",
          nextPrompts: "",
          transcript: "",
        },
      },
      [],
    );
    return {
      ok: false,
      degraded: true,
      note: "Mock mode — offline.",
      sources,
      opportunityMap: buildDiscoveryOpportunityMap(brief, sources),
    };
  }
  try {
    // Deadline (not an abandoning race) so Chrome is always released cleanly.
    const deadline = Date.now() + num("IDEACLYST_RESEARCH_BUDGET_MS", 60_000);
    const scout = await liveScout(await discoveryQueries(brief), deadline);
    // Only build an opportunity map from real sources (never fabricate from mock).
    return {
      ...scout,
      opportunityMap: scout.sources.length ? buildDiscoveryOpportunityMap(brief, scout.sources) : undefined,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown error";
    return { ok: false, degraded: true, note: `Scout unavailable (${reason}).`, sources: [] };
  }
}

/** Stage 2 — an honest, sourced market read (falls back to offline read). */
export async function marketReadFor(
  brief: DiscoveryBrief,
  sources: ResearchSource[],
): Promise<string> {
  if (researchMode() === "mock") {
    return strictResearch() ? STRICT_MOCK_NOTICE : mockMarketRead(brief);
  }
  if (sources.length === 0) {
    return strictResearch()
      ? STRICT_EMPTY_NOTICE
      : mockMarketRead(brief, "Live research returned no web sources — offline synthesis shown as a fallback.");
  }
  try {
    const ctxRun = { id: "discovery", title: brief.domain, idea: brief.domain } as unknown as Run;
    const md = await runAgent("claude", marketReadPrompt(brief, sources), {
      run: ctxRun,
      stepKey: "marketResearch",
    });
    if (md.trim()) return md.trim();
    return strictResearch() ? STRICT_EMPTY_NOTICE : mockMarketRead(brief);
  } catch {
    return strictResearch() ? STRICT_EMPTY_NOTICE : mockMarketRead(brief);
  }
}

/** Stage 3 — ranked, structured candidate concepts (falls back to offline). */
export async function candidatesFor(
  brief: DiscoveryBrief,
  sources: ResearchSource[],
  marketRead: string,
): Promise<IdeaCandidate[]> {
  if (researchMode() === "mock" || sources.length === 0) {
    // Strict mode: no fabricated candidates when there's no real data.
    if (strictResearch()) return [];
    return scoreCandidates(brief, mockDiscoveryCandidates(brief), sources);
  }
  try {
    const ctxRun = { id: "discovery", title: brief.domain, idea: brief.domain } as unknown as Run;
    const raw = await runAgent("claude", candidatesPrompt(brief, sources, marketRead), {
      run: ctxRun,
      stepKey: "marketResearch",
    });
    const parsed = parseCandidates(raw);
    if (parsed.length) return scoreCandidates(brief, parsed, sources);
    return strictResearch() ? [] : scoreCandidates(brief, mockDiscoveryCandidates(brief), sources);
  } catch {
    return strictResearch() ? [] : scoreCandidates(brief, mockDiscoveryCandidates(brief), sources);
  }
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T | undefined {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

function parseCandidates(raw: string): IdeaCandidate[] {
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fence ? fence[1] : raw;
  const efforts: readonly EffortLevel[] = ["low", "moderate", "high"];
  const strengths: readonly CommercialStrength[] = ["strong", "medium", "weak"];
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
        buildEffort: oneOf(c.buildEffort, efforts),
        commercial: oneOf(c.commercial, strengths),
        risk: typeof c.risk === "string" ? c.risk : undefined,
        fit: typeof c.fit === "string" ? c.fit : undefined,
        signal: typeof c.signal === "string" ? c.signal : undefined,
        sourceUrl: typeof c.sourceUrl === "string" && c.sourceUrl ? c.sourceUrl : undefined,
      }));
  } catch {
    return [];
  }
}
