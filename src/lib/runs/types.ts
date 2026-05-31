/**
 * Core data model for IdeaClyst runs. A "run" is one idea session: the founder
 * submits an idea, the Claude+Codex council deliberates over 5 steps, and the
 * outputs are assembled into a planning packet. Everything is persisted on disk
 * (see store.ts); these types describe the shape of `run.json`.
 */

export type RunGoal = "validate" | "plan" | "build" | "pitch" | "refine";

export type RunStatus = "queued" | "running" | "completed" | "failed";

/**
 * The council's produced artifacts. All fields are strings (Markdown) and start
 * empty; the orchestrator fills them in as each step completes, so a polling
 * client sees them appear progressively.
 */
export interface RunOutputs {
  // Web research gathered before the council deliberates (Markdown):
  researchFindings: string;
  /** Structured surfagent-derived toolkit rendered as Markdown. */
  researchToolkit: string;
  /** Concise founder-ready brief generated from the research toolkit. */
  founderBrief: string;
  /** Human-readable diff after a research/report rerun. */
  evolutionDiff: string;
  productStrategy: string;
  technicalArchitecture: string;
  claudeCritique: string;
  codexCritique: string;
  finalPlan: string;
  // Sections split out of the final plan by markdown.ts:
  summary: string;
  mvpBacklog: string;
  risks: string;
  validationTests: string;
  prd: string;
  nextPrompts: string;
  // Running log of every council exchange:
  transcript: string;
}

export interface Run {
  id: string;
  title: string;
  idea: string;
  targetCustomer?: string;
  constraints?: string;
  preferredStack?: string;
  /** Optional competitor URLs to deep-recon during research (comma/newline list). */
  competitorUrls?: string;
  /** Whether to run the web-research Step 0. Defaults to true. */
  includeResearch?: boolean;
  goal: RunGoal;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  error?: string;
  /** Human-readable label of the step currently executing (for the UI). */
  currentStep?: string;
  metrics?: RunMetrics;
  outputs: RunOutputs;
}

export interface RunMetrics {
  startedAt?: string;
  completedAt?: string;
  elapsedMs?: number;
  agentCalls: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
}

/** Input accepted by POST /api/runs. */
export interface CreateRunInput {
  title: string;
  idea: string;
  targetCustomer?: string;
  constraints?: string;
  preferredStack?: string;
  competitorUrls?: string;
  includeResearch?: boolean;
  goal: RunGoal;
}

export const RUN_GOALS: RunGoal[] = [
  "validate",
  "plan",
  "build",
  "pitch",
  "refine",
];

export function emptyOutputs(): RunOutputs {
  return {
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
  };
}
