/**
 * Discovery orchestrator. `startDiscovery` scouts the web for a domain and
 * synthesizes candidate ideas, persisting progress so the discovery page can poll.
 * Fired without await from the POST handler. Best-effort: a failure degrades to
 * offline candidates rather than crashing.
 */

import { getDiscovery, updateDiscovery, writeDiscoveryFile } from "./store";
import { discoverIdeas } from "../research";

function candidatesMarkdown(domain: string, notes: string, list: { title: string; idea: string; targetCustomer?: string; signal?: string; sourceUrl?: string }[]): string {
  const head = `# Idea candidates — ${domain}\n${notes ? `\n> ${notes}\n` : ""}`;
  const body = list
    .map(
      (c, i) =>
        `\n## ${i + 1}. ${c.title}\n${c.idea}\n${c.targetCustomer ? `\n**Who:** ${c.targetCustomer}` : ""}${c.signal ? `\n**Signal:** ${c.signal}` : ""}${c.sourceUrl ? `\n**Source:** ${c.sourceUrl}` : ""}\n`,
    )
    .join("");
  return head + body;
}

export async function startDiscovery(id: string): Promise<void> {
  const d = await getDiscovery(id);
  if (!d) return;
  if (d.status !== "queued") return;

  try {
    await updateDiscovery(id, { status: "running", currentStep: "Scouting sources" });

    const result = await discoverIdeas(d.domain);

    const notes = result.note
      ? `${result.degraded ? "Partial/offline: " : ""}${result.note}`
      : "Live web scouting.";
    const md = candidatesMarkdown(d.domain, notes, result.candidates);
    await writeDiscoveryFile(id, "CANDIDATES.md", md);

    await updateDiscovery(id, {
      status: "completed",
      currentStep: undefined,
      candidates: result.candidates,
      scoutNotes: notes,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error during discovery";
    await updateDiscovery(id, { status: "failed", error: message, currentStep: undefined }).catch(
      () => {},
    );
  }
}
