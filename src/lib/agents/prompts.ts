/**
 * Prompt builders for the 5-step council. Each builder takes the run brief (and,
 * where relevant, prior step outputs) and returns the full prompt string handed
 * to runAgent(). Keeping these here makes the orchestrator a thin pipeline and
 * the wording easy to tune in one place.
 */

import { Run } from "../runs/types";

function brief(run: Run): string {
  const lines = [
    `Title: ${run.title}`,
    `Goal of this session: ${run.goal}`,
    `Idea: ${run.idea}`,
  ];
  if (run.targetCustomer) lines.push(`Target customer: ${run.targetCustomer}`);
  if (run.constraints) lines.push(`Constraints: ${run.constraints}`);
  if (run.preferredStack) lines.push(`Preferred stack: ${run.preferredStack}`);
  return lines.join("\n");
}

const FORMAT_NOTE =
  "Respond in clean Markdown. Use `##` for top-level sections. Be concrete and " +
  "specific to this idea — no generic boilerplate. Do not ask questions or " +
  "request clarification; make reasonable assumptions and state them.";

/** Optional market-research context block, injected after the idea brief. */
function researchSection(research?: string): string {
  if (!research || !research.trim()) return "";
  return [
    "",
    "## Market research (from web scouting)",
    "Use this as grounding evidence. It may be incomplete or, in offline mode, synthesized.",
    research.trim(),
  ].join("\n");
}

/** Step 1 — Claude as a skeptical SaaS founder / product strategist. */
export function productStrategyPrompt(run: Run, research?: string): string {
  return [
    "You are a skeptical, experienced SaaS founder acting as product strategist.",
    "You have seen many ideas fail. Pressure-test this one and shape it into a",
    "credible product strategy. Cover: the core problem and who feels it most,",
    "the sharpest wedge / initial use case, target customer and willingness to pay,",
    "differentiation vs. obvious alternatives, a go-to-market angle, and the riskiest",
    "assumptions that must be true. Be honest about weaknesses.",
    "",
    "## Idea brief",
    brief(run),
    researchSection(research),
    "",
    FORMAT_NOTE,
  ].join("\n");
}

/** Step 2 — Codex as a pragmatic CTO, given the idea + Claude's strategy. */
export function technicalArchitecturePrompt(
  run: Run,
  productStrategy: string,
  research?: string,
): string {
  return [
    "You are a pragmatic CTO. Given the idea and the product strategy below, design",
    "a lean, buildable technical architecture for an MVP. Cover: recommended stack",
    "and why, core data model, key services/components, third-party APIs, the main",
    "build risks, and a rough sequencing of what to build first. Favor shipping fast",
    "over completeness. Call out anything in the strategy that is technically naive.",
    "",
    "## Idea brief",
    brief(run),
    researchSection(research),
    "",
    "## Product strategy (from the strategist)",
    productStrategy,
    "",
    FORMAT_NOTE,
  ].join("\n");
}

/** Step 3 — Claude critiques Codex's technical plan. */
export function claudeCritiquePrompt(
  run: Run,
  technicalArchitecture: string,
  research?: string,
): string {
  return [
    "You are the skeptical founder again. Critique the CTO's technical architecture",
    "below from a product and business lens: Is it over-engineered for an MVP? Does",
    "it serve the wedge use case? What would you cut to ship in weeks not months?",
    "Where does it add risk or cost without customer value? Be specific and direct.",
    "",
    "## Idea brief",
    brief(run),
    researchSection(research),
    "",
    "## Technical architecture (from the CTO)",
    technicalArchitecture,
    "",
    FORMAT_NOTE,
  ].join("\n");
}

/** Step 4 — Codex critiques Claude's product strategy. */
export function codexCritiquePrompt(
  run: Run,
  productStrategy: string,
  research?: string,
): string {
  return [
    "You are the pragmatic CTO. Critique the product strategy below from an",
    "engineering-reality lens: Which assumptions are technically expensive or",
    "infeasible for an MVP? Where does the go-to-market imply scope the team can't",
    "deliver quickly? What technical constraints should reshape the strategy? Be",
    "specific and constructive.",
    "",
    "## Idea brief",
    brief(run),
    researchSection(research),
    "",
    "## Product strategy (from the strategist)",
    productStrategy,
    "",
    FORMAT_NOTE,
  ].join("\n");
}

/** Step 5 — Claude synthesizes everything into the final founder packet. */
export function finalSynthesisPrompt(
  run: Run,
  parts: {
    productStrategy: string;
    technicalArchitecture: string;
    claudeCritique: string;
    codexCritique: string;
  },
  research?: string,
): string {
  return [
    "You are the lead synthesizer. Reconcile the strategy, architecture, and both",
    "critiques below into a single, decisive founder planning packet. Resolve",
    "disagreements with a clear recommendation. Output EXACTLY these `##` sections,",
    "in this order, with these headings:",
    "",
    "## Summary",
    "A tight executive summary of the recommended product and approach.",
    "## MVP Backlog",
    "An ordered, buildable backlog of the smallest valuable first release.",
    "## Risks",
    "The top risks and assumptions, each with a mitigation.",
    "## Validation Tests",
    "Concrete experiments to validate the riskiest assumptions, with success metrics.",
    "Where the market research provides real evidence (competitors, complaints, demand",
    "signals), cite it and include the source link so each test is grounded.",
    "## Next Prompts",
    "Ready-to-paste prompts the founder can hand to an AI coding agent to start building.",
    "",
    "## Idea brief",
    brief(run),
    researchSection(research),
    "",
    "## Product strategy",
    parts.productStrategy,
    "",
    "## Technical architecture",
    parts.technicalArchitecture,
    "",
    "## Founder's critique of the architecture",
    parts.claudeCritique,
    "",
    "## CTO's critique of the strategy",
    parts.codexCritique,
    "",
    FORMAT_NOTE,
  ].join("\n");
}
