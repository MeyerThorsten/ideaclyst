import { listDecisions } from "../decisions/store";

export async function compactCouncilMemory(): Promise<string> {
  const decisions = await listDecisions();
  if (!decisions.length) return "";
  const relevant = decisions.slice(0, 12).map((decision) =>
    `- ${decision.type}: ${decision.title}. Evidence: ${decision.evidence || "none recorded"}. Rationale: ${decision.rationale}`,
  );
  return [
    "## Local council memory",
    "Use this compact local memory to avoid repeating prior mistakes. It is user-inspectable in the decision log.",
    ...relevant,
  ].join("\n");
}
