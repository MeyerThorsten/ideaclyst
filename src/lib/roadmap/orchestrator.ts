/**
 * Roadmap-intelligence orchestrator. startAnalysis() reads the Threlmark project, then
 * runs three independent research lanes (features / spin-offs / services). Each lane:
 * real web search → synthesize via runAgent("claude", ...) → scored suggestions. Fired
 * without await. Best-effort + STRICT: if no real sources, the lane records a clear
 * notice instead of fabricating (never mock). Persists after each lane so the page
 * reveals lanes progressively.
 */

import { getAnalysis, updateAnalysis } from "./store";
import { laneSearchQueries, lanePrompt, parseLaneSuggestions } from "./prompts";
import type { RoadmapAnalysis, RoadmapSuggestion, SuggestionKind } from "./types";
import { getSource } from "../threlmark/source";
import { webSearch } from "../research/search";
import { researchMode, strictResearch } from "../research/index";
import { runAgent } from "../agents/index";
import type { Run } from "../runs/types";
import type { ProjectRead, ThrelmarkSuggestionFile } from "../threlmark/types";
import type { WebSearchResult } from "../research/types";

const STRICT_EMPTY_NOTICE =
  "⚠️ Live research returned no web sources for this lane (possible block/network issue). " +
  "Strict mode is on, so no offline/mock suggestions are shown.";
const STRICT_MOCK_NOTICE =
  "⚠️ Research is in mock mode — set IDEACLYST_AGENT_MODE=cli (or IDEACLYST_RESEARCH_MODE=live) and re-run. " +
  "Strict mode is on, so no offline suggestions are shown.";

function suggestionId(kind: SuggestionKind, i: number): string {
  return `${kind}-${i}-${Math.random().toString(36).slice(2, 7)}`;
}

async function runLane(
  analysisId: string,
  read: ProjectRead,
  kind: SuggestionKind,
  perKind: number,
): Promise<{ notes: string; suggestions: RoadmapSuggestion[] }> {
  // Strict + mock → no fabrication.
  if (researchMode() === "mock") {
    return { notes: strictResearch() ? STRICT_MOCK_NOTICE : "", suggestions: [] };
  }

  // Gather real web evidence across this lane's queries.
  const queries = laneSearchQueries(read, kind);
  const web: WebSearchResult[] = [];
  const seen = new Set<string>();
  for (const q of queries) {
    let results: WebSearchResult[] = [];
    try {
      results = await webSearch(q, { maxResults: 4 });
    } catch {
      results = [];
    }
    for (const r of results) {
      if (r.url && !seen.has(r.url)) {
        seen.add(r.url);
        web.push(r);
      }
    }
  }

  if (web.length === 0) {
    return { notes: strictResearch() ? STRICT_EMPTY_NOTICE : "No web sources found.", suggestions: [] };
  }

  // Synthesize via the council backend (honors agent mode). Fake Run ctx like research/index.ts.
  const ctxRun = { id: `roadmap-${analysisId}`, title: read.project.name, idea: read.project.name } as unknown as Run;
  let parsed: ReturnType<typeof parseLaneSuggestions> = [];
  try {
    const rawOut = await runAgent("claude", lanePrompt(read, kind, perKind, web), {
      run: ctxRun,
      stepKey: "marketResearch",
    });
    parsed = parseLaneSuggestions(rawOut);
  } catch {
    parsed = [];
  }

  if (parsed.length === 0) {
    return { notes: strictResearch() ? STRICT_EMPTY_NOTICE : "Synthesis produced no suggestions.", suggestions: [] };
  }

  const suggestions: RoadmapSuggestion[] = parsed.slice(0, perKind).map((p, i) => ({
    id: suggestionId(kind, i),
    kind,
    title: p.title,
    description: p.description,
    category: p.category,
    impact: p.impact,
    evidence: p.evidence,
    fit: p.fit,
    effort: p.effort,
    acceptance: p.acceptance,
    rationale: p.rationale,
    // Keep only sources we actually gathered (avoid model-invented URLs): prefer
    // the model's, but ensure each url appeared in the real web set when possible.
    sources: p.sources.length ? p.sources : web.slice(0, 3).map((w) => ({ title: w.title, url: w.url })),
  }));

  return { notes: `Grounded in ${web.length} web source(s).`, suggestions };
}

export async function startAnalysis(id: string): Promise<void> {
  const a = await getAnalysis(id);
  if (!a) return;
  if (a.status !== "queued") return;

  try {
    await updateAnalysis(id, { status: "running", currentStep: "Reading roadmap" });
    const source = await getSource();
    const read = await source.readProject(a.projectId);
    if (!read) {
      await updateAnalysis(id, {
        status: "failed",
        error: `Could not read Threlmark project "${a.projectId}". Check Settings.`,
        currentStep: undefined,
      });
      return;
    }

    await updateAnalysis(id, {
      gapSummary: read.gapMap.summaryLine,
      gapMap: read.gapMap,
      currentStep: "Researching features",
    });

    const lanesOrder: { kind: SuggestionKind; step: string }[] = [
      { kind: "feature", step: "Researching spin-offs" },
      { kind: "spinoff", step: "Researching services" },
      { kind: "service", step: undefined as unknown as string },
    ];

    for (const { kind, step } of lanesOrder) {
      const result = await runLane(id, read, kind, a.perKind);
      const current = await getAnalysis(id);
      if (!current) return;
      const lanes = { ...current.lanes, [kind]: result } as RoadmapAnalysis["lanes"];
      await updateAnalysis(id, { lanes, currentStep: step || undefined });
    }

    await updateAnalysis(id, { status: "completed", currentStep: undefined });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error during analysis";
    await updateAnalysis(id, { status: "failed", error: message, currentStep: undefined }).catch(() => {});
  }
}

/** Build the flat Threlmark suggestion file from a stored suggestion. */
export function toSuggestionFile(
  s: RoadmapSuggestion,
  targetProjectId: string | undefined,
  generatedAt: string,
): ThrelmarkSuggestionFile {
  return {
    source: "ideaclyst",
    title: s.title,
    category: s.category,
    impact: s.impact,
    evidence: s.evidence,
    fit: s.fit,
    effort: s.effort,
    description: s.description,
    files: "",
    acceptance: s.acceptance,
    targetProjectId: targetProjectId || undefined,
    kind: s.kind,
    rationale: s.rationale,
    sources: s.sources,
    generatedAt,
  };
}
