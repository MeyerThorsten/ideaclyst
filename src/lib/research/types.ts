/**
 * Shared types for the research layer (market research, competitor teardown,
 * idea-discovery scouting). All research is best-effort: results carry ok/degraded
 * flags and a human-readable note instead of throwing.
 */

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface ResearchSource {
  url: string;
  title: string;
  summary: string;
  kind: "serp" | "page";
}

export interface ResearchResult {
  ok: boolean; // true if any real web data was gathered
  degraded: boolean; // true if it fell back / hit caps / Chrome missing
  note?: string; // human-readable status, surfaced in the findings doc
  findings: string; // researchFindings Markdown — ALWAYS non-empty
  sources: ResearchSource[];
}

export type EffortLevel = "low" | "moderate" | "high";
export type CommercialStrength = "strong" | "medium" | "weak";

export interface IdeaCandidate {
  id: string;
  title: string;
  idea: string; // the wedge / what it does in 1–2 sentences
  targetCustomer?: string; // who pays
  buildEffort?: EffortLevel;
  commercial?: CommercialStrength;
  risk?: string; // the main risk, one line
  fit?: string; // why it fits the stated goal + capacity
  signal?: string; // the demand signal that surfaced it
  sourceUrl?: string;
}

export interface DiscoveryScoutResult {
  ok: boolean;
  degraded: boolean;
  note?: string;
  sources: ResearchSource[];
}

/** The founder's brief for an idea-discovery run. */
export interface DiscoveryBrief {
  domain: string;
  goal: string; // commercial | portfolio | learning | personal
  capacity: string; // solo-pro | solo-learning | team | ai-assisted
  constraints?: string;
}

export interface DiscoveryOutput {
  marketRead: string;
  candidates: IdeaCandidate[];
  sources: ResearchSource[];
  degraded: boolean;
  note?: string;
}
