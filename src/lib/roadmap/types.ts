/**
 * IdeaClyst-owned analysis state (separate from Threlmark). One analysis = one run
 * of the three research lanes against one Threlmark project. Persisted on disk like
 * discoveries (see store.ts).
 */

import type { GapMap } from "../threlmark/types";

export type AnalysisStatus = "queued" | "running" | "completed" | "failed";
export type SuggestionKind = "feature" | "spinoff" | "service";

export interface RoadmapSuggestion {
  id: string; // local id within the analysis
  kind: SuggestionKind;
  title: string;
  description: string;
  category: string; // one of Threlmark's fixed categories
  impact: number;
  evidence: number;
  fit: number;
  effort: number;
  acceptance: string[];
  rationale: string; // why-now
  sources: { title: string; url: string }[];
  sentSuggestionId?: string; // set once written to Threlmark
  sentTargetProjectId?: string;
}

export interface RoadmapAnalysis {
  id: string;
  projectId: string;
  projectName: string;
  perKind: number; // N requested per lane
  status: AnalysisStatus;
  createdAt: string;
  updatedAt: string;
  currentStep?: string;
  error?: string;
  gapSummary: string;
  gapMap?: GapMap;
  lanes: {
    feature: { notes: string; suggestions: RoadmapSuggestion[] };
    spinoff: { notes: string; suggestions: RoadmapSuggestion[] };
    service: { notes: string; suggestions: RoadmapSuggestion[] };
  };
}

export interface CreateAnalysisInput {
  projectId: string;
  perKind: number;
}
