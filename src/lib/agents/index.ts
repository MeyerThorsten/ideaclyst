/**
 * The single mode-aware seam. The orchestrator calls `runAgent(...)` and never
 * learns which backend ran. `IDEACLYST_AGENT_MODE` selects the backend:
 *   - "mock" (default): realistic offline Markdown, idea-aware.
 *   - "cli": the real `claude` / `codex` CLIs via spawn.
 *
 * In mock mode the prompt is ignored in favor of the structured run + step (so
 * output is tailored and deterministic); in CLI mode the run/step are ignored
 * and the prompt drives the real agent.
 */

import { Run } from "../runs/types";
import { runMock, CouncilStepKey } from "./mock";
import { runClaude } from "./claude";
import { runCodex } from "./codex";

export type AgentName = "claude" | "codex";

export type AgentMode = "mock" | "cli";

export function agentMode(): AgentMode {
  return process.env.IDEACLYST_AGENT_MODE === "cli" ? "cli" : "mock";
}

export interface RunAgentContext {
  /** Run brief — required for mock mode's idea-aware output. */
  run: Run;
  /** Which council step this call represents — selects the mock generator. */
  stepKey: CouncilStepKey;
}

export async function runAgent(
  agent: AgentName,
  prompt: string,
  ctx: RunAgentContext,
): Promise<string> {
  if (agentMode() === "mock") {
    return runMock(ctx.run, ctx.stepKey);
  }
  return agent === "claude" ? runClaude(prompt) : runCodex(prompt);
}

export type { CouncilStepKey };
