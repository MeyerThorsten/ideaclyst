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

export interface IdeaCandidate {
  id: string;
  title: string;
  idea: string;
  targetCustomer?: string;
  signal?: string; // why it surfaced
  sourceUrl?: string;
}

export interface DiscoveryScoutResult {
  ok: boolean;
  degraded: boolean;
  note?: string;
  sources: ResearchSource[];
}
