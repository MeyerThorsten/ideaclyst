/**
 * Data model for the Idea Discovery flow. A "discovery" scouts the web for a
 * domain/market and proposes candidate ideas the user can promote into a full
 * council run. Persisted on disk like runs (see store.ts).
 */

import { IdeaCandidate } from "../research/types";

export type { IdeaCandidate };

export type DiscoveryStatus = "queued" | "running" | "completed" | "failed";

export interface Discovery {
  id: string;
  domain: string;
  status: DiscoveryStatus;
  createdAt: string;
  updatedAt: string;
  error?: string;
  /** Human-readable label of the current phase (for the UI). */
  currentStep?: string;
  candidates: IdeaCandidate[];
  /** Markdown notes about what was scouted + any degraded/offline note. */
  scoutNotes: string;
}

export interface CreateDiscoveryInput {
  domain: string;
}
