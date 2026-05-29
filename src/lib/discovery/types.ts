/**
 * Data model for the Idea Discovery flow. A "discovery" takes a market + the
 * founder's goal and capacity, scouts the web, produces an honest market read,
 * and proposes ranked candidate ideas the user can promote into a full council
 * run. Persisted on disk like runs (see store.ts).
 */

import { IdeaCandidate } from "../research/types";

export type { IdeaCandidate };

export type DiscoveryGoal = "commercial" | "portfolio" | "learning" | "personal";
export type DiscoveryCapacity = "solo-pro" | "solo-learning" | "team" | "ai-assisted";

export const DISCOVERY_GOALS: DiscoveryGoal[] = ["commercial", "portfolio", "learning", "personal"];
export const DISCOVERY_CAPACITIES: DiscoveryCapacity[] = [
  "solo-pro",
  "solo-learning",
  "team",
  "ai-assisted",
];

export type DiscoveryStatus = "queued" | "running" | "completed" | "failed";

export interface Discovery {
  id: string;
  domain: string;
  goal: DiscoveryGoal;
  capacity: DiscoveryCapacity;
  constraints?: string;
  status: DiscoveryStatus;
  createdAt: string;
  updatedAt: string;
  error?: string;
  /** Human-readable label of the current phase (for the UI). */
  currentStep?: string;
  /** Honest market landscape (Markdown), filled before candidates. */
  marketRead: string;
  candidates: IdeaCandidate[];
  /** Status/degraded note about scouting. */
  scoutNotes: string;
}

export interface CreateDiscoveryInput {
  domain: string;
  goal: DiscoveryGoal;
  capacity: DiscoveryCapacity;
  constraints?: string;
}
