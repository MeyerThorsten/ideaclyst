/**
 * Discovery orchestrator. `startDiscovery` scouts the web for a market, writes an
 * honest market read, then proposes ranked candidate ideas — persisting after each
 * stage so the discovery page reveals them progressively (like the council). Fired
 * without await from the POST handler. Best-effort: failures degrade to offline
 * output rather than crashing.
 */

import { getDiscovery, updateDiscovery, writeDiscoveryFile } from "./store";
import { Discovery, IdeaCandidate } from "./types";
import { scoutMarket, marketReadFor, candidatesFor } from "../research";
import { renderOpportunityMapMarkdown } from "../research/artifacts";
import { renderCandidateInsightReportMarkdown } from "../research/idea-reports";

function candidatesMarkdown(domain: string, list: IdeaCandidate[]): string {
  const head = `# Idea candidates — ${domain}\n`;
  const body = list
    .map((c, i) => {
      const meta = [
        c.buildEffort ? `**Build:** ${c.buildEffort}` : "",
        c.commercial ? `**Commercial:** ${c.commercial}` : "",
      ]
        .filter(Boolean)
        .join(" · ");
      return [
        `\n## ${i + 1}. ${c.title}`,
        c.idea,
        c.targetCustomer ? `\n**Who pays:** ${c.targetCustomer}` : "",
        meta ? `\n${meta}` : "",
        c.risk ? `\n**Risk:** ${c.risk}` : "",
        c.fit ? `\n**Fit:** ${c.fit}` : "",
        c.signal ? `\n**Signal:** ${c.signal}` : "",
        c.confidence ? `\n**Confidence:** ${c.confidence.overall}/100` : "",
        c.killCriteria?.length ? `\n**Kill criteria:** ${c.killCriteria.join("; ")}` : "",
        c.sourceUrl ? `\n**Source:** ${c.sourceUrl}` : "",
        c.report ? `\n${renderCandidateInsightReportMarkdown(c)}` : "",
        "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("");
  return head + body;
}

export async function startDiscovery(id: string): Promise<void> {
  const d = await getDiscovery(id);
  if (!d) return;
  if (d.status !== "queued") return;

  const brief = {
    domain: d.domain,
    goal: d.goal,
    capacity: d.capacity,
    constraints: d.constraints,
  };

  try {
    await updateDiscovery(id, { status: "running", currentStep: "Scouting the market" });

    // Stage 1 — scout the web.
    const scout = await scoutMarket(brief);
    const notes = scout.note
      ? `${scout.degraded ? "Partial/offline: " : ""}${scout.note}`
      : "Live web scouting.";
    const opportunityMap = scout.opportunityMap
      ? renderOpportunityMapMarkdown(scout.opportunityMap)
      : "";
    if (opportunityMap) {
      await writeDiscoveryFile(id, "OPPORTUNITY_MAP.md", opportunityMap);
    }

    // Stage 2 — honest market read.
    await updateDiscovery(id, {
      currentStep: "Reading the market",
      scoutNotes: notes,
      opportunityMap,
      sources: scout.sources,
    });
    const marketRead = await marketReadFor(brief, scout.sources);
    await writeDiscoveryFile(id, "MARKET_READ.md", marketRead);
    await updateDiscovery(id, { marketRead, currentStep: "Proposing ideas" });

    // Stage 3 — ranked candidate concepts.
    const candidates = await candidatesFor(brief, scout.sources, marketRead);
    await writeDiscoveryFile(id, "CANDIDATES.md", candidatesMarkdown(d.domain, candidates));
    const reportsMarkdown = candidates
      .map((candidate) => renderCandidateInsightReportMarkdown(candidate))
      .filter(Boolean)
      .join("\n\n---\n\n");
    if (reportsMarkdown) {
      await writeDiscoveryFile(id, "CANDIDATE_REPORTS.md", reportsMarkdown);
    }

    const patch: Partial<Discovery> = {
      status: "completed",
      currentStep: undefined,
      candidates,
    };
    await updateDiscovery(id, patch);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error during discovery";
    await updateDiscovery(id, { status: "failed", error: message, currentStep: undefined }).catch(
      () => {},
    );
  }
}
