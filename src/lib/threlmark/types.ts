/**
 * Real Threlmark on-disk shapes (verified against ~/.threlmark), plus IdeaClyst-side
 * summaries. Threlmark owns project.json/board.json/items/*; IdeaClyst reads those
 * read-only and writes only suggestions/<id>.json. Kept tolerant: readers default
 * and clamp so a malformed external write never crashes us.
 */

import type { ThrelmarkCategory } from "./categories";

export const THRELMARK_LANES = ["idea", "ranked", "development", "done"] as const;
export type ThrelmarkStatus = (typeof THRELMARK_LANES)[number];

export interface ThrelmarkProject {
  schemaVersion?: number;
  id: string;
  name: string;
  slug: string;
  description?: string;
  repoPath?: string;
  color?: string;
  status: string; // "active" | "archived"
  createdAt: string;
  updatedAt: string;
}

export interface ThrelmarkItem {
  schemaVersion?: number;
  id: string;
  projectId: string;
  title: string;
  category: ThrelmarkCategory;
  status: ThrelmarkStatus;
  impact: number; // 1-5
  evidence: number; // 1-5
  fit: number; // 1-5
  effort: number; // 1-5
  description: string;
  files: string;
  acceptance: string[];
  source?: string;
  createdAt: string;
  updatedAt: string;
}

/** Item enriched with the computed priority (never persisted by us). */
export type ThrelmarkItemView = ThrelmarkItem & { priority: number };

export interface ThrelmarkBoard {
  schemaVersion?: number;
  lanes: Record<ThrelmarkStatus, string[]>;
  updatedAt?: string;
}

/** Flat suggestion file written into projects/<id>/suggestions/<sugId>.json. */
export interface ThrelmarkSuggestionFile {
  source: "ideaclyst";
  title: string;
  category: string;
  impact: number;
  evidence: number;
  fit: number;
  effort: number;
  description: string;
  files: string;
  acceptance: string[];
  targetProjectId?: string;
  // provenance extras (Threlmark preserves unknown keys; its Inbox ignores them):
  kind: "feature" | "spinoff" | "service";
  rationale: string;
  sources: { title: string; url: string }[];
  generatedAt: string;
}

/** Lightweight project summary for the picker. */
export interface ProjectSummary {
  id: string;
  name: string;
  itemCount: number;
  doneCount: number;
  openCount: number;
}

/** Deterministic coverage/gap summary built from a project's items. */
export interface GapMap {
  categoryCoverage: { category: string; total: number; done: number; open: number }[];
  laneCounts: Record<ThrelmarkStatus, number>;
  topOpenItems: { title: string; category: string; priority: number }[];
  underCovered: string[]; // categories with 0-1 items
  summaryLine: string; // one-line human summary for prompts
}

/** Everything a project read returns. */
export interface ProjectRead {
  project: ThrelmarkProject;
  items: ThrelmarkItemView[];
  board: ThrelmarkBoard;
  gapMap: GapMap;
}
