import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { listCandidateRefs } from "../discovery/candidates";
import { listDiscoveries } from "../discovery/store";
import { listRuns, runDir } from "../runs/store";
import { DossierEntry, ResearchSource } from "../research/types";
import { confidenceLabel, freshnessLabel, isSyntheticSource, sourceConfidence } from "./scoring";

export interface EvidenceRecord {
  id: string;
  title: string;
  url: string;
  sourceType: string;
  sourceName: string;
  parentType: "run" | "discovery" | "report";
  parentTitle: string;
  parentHref: string;
  summary: string;
  claims: string[];
  confidenceScore: number;
  confidenceLabel: string;
  freshnessLabel: string;
  warning?: string;
}

function claimsFromSummary(summary: string): string[] {
  return summary
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((claim) => claim.trim())
    .filter((claim) => claim.length > 30)
    .slice(0, 3);
}

function recordFromSource(
  source: ResearchSource,
  parent: Pick<EvidenceRecord, "parentType" | "parentTitle" | "parentHref">,
  retrievedAt?: string,
): EvidenceRecord {
  const confidenceScore = sourceConfidence(source);
  const synthetic = isSyntheticSource(source);
  return {
    id: `${parent.parentType}:${parent.parentHref}:${source.url}:${source.title}`,
    title: source.title || source.url,
    url: source.url,
    sourceType: source.sourceType || "search",
    sourceName: source.sourceName || "Source",
    summary: source.summary || "No extracted summary recorded.",
    claims: claimsFromSummary(source.summary || ""),
    confidenceScore,
    confidenceLabel: confidenceLabel(confidenceScore),
    freshnessLabel: freshnessLabel(retrievedAt),
    warning: synthetic ? "Mock/offline or non-public source; do not treat as market evidence." : undefined,
    ...parent,
  };
}

function isResearchSource(value: unknown): value is ResearchSource {
  return Boolean(value && typeof value === "object" && "url" in value);
}

async function runDossier(runId: string): Promise<DossierEntry[]> {
  try {
    const parsed: unknown = JSON.parse(await readFile(join(runDir(runId), "RESEARCH_DOSSIER.json"), "utf8"));
    return Array.isArray(parsed) ? (parsed as DossierEntry[]) : [];
  } catch {
    return [];
  }
}

export async function listEvidence(): Promise<EvidenceRecord[]> {
  const [discoveries, candidates, runs] = await Promise.all([listDiscoveries(), listCandidateRefs(), listRuns()]);
  const records: EvidenceRecord[] = [];

  for (const discovery of discoveries) {
    const sources = Array.isArray(discovery.sources) ? discovery.sources : [];
    for (const source of sources.filter(isResearchSource)) {
      records.push(recordFromSource(source, {
        parentType: "discovery",
        parentTitle: discovery.domain || discovery.id,
        parentHref: `/discover/${discovery.id}`,
      }, discovery.updatedAt));
    }
  }

  for (const ref of candidates) {
    const sources = Array.isArray(ref.report.sources) ? ref.report.sources : [];
    for (const source of sources.filter(isResearchSource)) {
      records.push(recordFromSource(source, {
        parentType: "report",
        parentTitle: ref.candidate.title,
        parentHref: ref.href,
      }, ref.report.generatedAt));
    }
  }

  for (const run of runs) {
    for (const entry of await runDossier(run.id)) {
      records.push({
        id: `run:${run.id}:${entry.id}`,
        title: entry.title || entry.url,
        url: entry.url,
        sourceType: entry.sourceType,
        sourceName: entry.sourceName || "Research dossier",
        parentType: "run",
        parentTitle: run.title,
        parentHref: `/runs/${run.id}`,
        summary: entry.summary,
        claims: Array.isArray(entry.extractedClaims) ? entry.extractedClaims : [],
        confidenceScore: entry.confidence,
        confidenceLabel: confidenceLabel(entry.confidence),
        freshnessLabel: freshnessLabel(entry.retrievedAt),
        warning: entry.confidence < 40 ? "Low-confidence source; verify before promotion." : undefined,
      });
    }
  }

  const seen = new Set<string>();
  return records
    .filter((record) => {
      const key = `${record.parentHref}:${record.url}:${record.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.confidenceScore - a.confidenceScore || a.title.localeCompare(b.title));
}
