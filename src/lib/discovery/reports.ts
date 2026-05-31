import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { getCandidateRef } from "./candidates";
import { updateDiscovery, writeDiscoveryFile, discoveryDir } from "./store";
import { buildCandidateInsightReport, renderCandidateInsightReportMarkdown } from "../research/idea-reports";
import { CandidateInsightReport, IdeaCandidate } from "../research/types";

export interface ReportVersion {
  id: string;
  candidateId: string;
  title: string;
  generatedAt: string;
  report: CandidateInsightReport;
  diff: ReportDiff;
}

export interface ReportDiff {
  summary: string;
  scoreDeltas: string[];
  sourceDeltas: string[];
  actionDeltas: string[];
}

function scoreMap(report: CandidateInsightReport): Map<string, number> {
  return new Map(report.scores.map((score) => [score.label, score.score]));
}

function diffReports(previous: CandidateInsightReport, next: CandidateInsightReport): ReportDiff {
  const before = scoreMap(previous);
  const scoreDeltas = next.scores
    .map((score) => {
      const old = before.get(score.label);
      if (old === undefined || old === score.score) return "";
      return `${score.label}: ${old} -> ${score.score}`;
    })
    .filter(Boolean);
  const previousUrls = new Set(previous.sources.map((source) => source.url));
  const nextUrls = new Set(next.sources.map((source) => source.url));
  const sourceDeltas = [
    ...next.sources.filter((source) => !previousUrls.has(source.url)).map((source) => `Added ${source.url}`),
    ...previous.sources.filter((source) => !nextUrls.has(source.url)).map((source) => `Removed ${source.url}`),
  ];
  const oldActions = new Set(previous.executionPlan.nextActions);
  const actionDeltas = next.executionPlan.nextActions.filter((action) => !oldActions.has(action)).map((action) => `New action: ${action}`);
  return {
    summary: scoreDeltas.length || sourceDeltas.length || actionDeltas.length
      ? "Report refreshed with detectable changes."
      : "Report refreshed; no material local changes detected.",
    scoreDeltas,
    sourceDeltas,
    actionDeltas,
  };
}

async function readVersions(discoveryId: string): Promise<ReportVersion[]> {
  try {
    const parsed = JSON.parse(await readFile(join(discoveryDir(discoveryId), "report-versions.json"), "utf8")) as { versions?: ReportVersion[] };
    return Array.isArray(parsed.versions) ? parsed.versions : [];
  } catch {
    return [];
  }
}

export async function listReportVersions(discoveryId: string, candidateId: string): Promise<ReportVersion[]> {
  return (await readVersions(discoveryId)).filter((version) => version.candidateId === candidateId);
}

export async function refreshCandidateReport(discoveryId: string, candidateId: string): Promise<{ candidate: IdeaCandidate; diff: ReportDiff }> {
  const ref = await getCandidateRef(discoveryId, candidateId);
  if (!ref) throw new Error("Candidate not found");
  const previous = ref.report;
  const next = buildCandidateInsightReport({
    domain: ref.discovery.domain,
    goal: ref.discovery.goal || "commercial",
    capacity: ref.discovery.capacity || "ai-assisted",
    constraints: ref.discovery.constraints,
  }, ref.candidate, ref.discovery.sources || []);
  const diff = diffReports(previous, next);
  const candidates = ref.discovery.candidates.map((candidate) =>
    candidate.id === candidateId ? { ...candidate, report: next } : candidate,
  );
  await updateDiscovery(discoveryId, { candidates });
  const versions = await readVersions(discoveryId);
  const version: ReportVersion = {
    id: `${Date.now().toString(36)}-${candidateId}`,
    candidateId,
    title: ref.candidate.title,
    generatedAt: next.generatedAt,
    report: previous,
    diff,
  };
  const nextVersions = [version, ...versions].slice(0, 80);
  await writeDiscoveryFile(discoveryId, "report-versions.json", JSON.stringify({ updatedAt: new Date().toISOString(), versions: nextVersions }, null, 2));
  await writeDiscoveryFile(discoveryId, `REPORT_${candidateId}.md`, renderCandidateInsightReportMarkdown({ ...ref.candidate, report: next }));
  return { candidate: { ...ref.candidate, report: next }, diff };
}
