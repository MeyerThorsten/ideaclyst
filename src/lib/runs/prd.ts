import { Run } from "./types";

export function renderRunPrd(run: Run): string {
  return [
    `# PRD: ${run.title}`,
    "",
    `**Goal:** ${run.goal}`,
    run.targetCustomer ? `**Target customer:** ${run.targetCustomer}` : "",
    "",
    "## Problem",
    run.idea,
    "",
    "## Product Strategy",
    run.outputs.productStrategy || "Not generated yet.",
    "",
    "## Technical Plan",
    run.outputs.technicalArchitecture || "Not generated yet.",
    "",
    "## MVP Backlog",
    run.outputs.mvpBacklog || "Not generated yet.",
    "",
    "## Acceptance Criteria",
    run.outputs.validationTests || "Not generated yet.",
    "",
    "## Risks",
    run.outputs.risks || "Not generated yet.",
  ].filter(Boolean).join("\n");
}
