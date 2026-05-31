import { getDiscovery, listDiscoveries } from "./store";
import { Discovery, DiscoveryCapacity, DiscoveryGoal } from "./types";
import { ensureCandidateInsightReport } from "../research/idea-reports";
import { CandidateInsightReport, DiscoveryBrief, IdeaCandidate } from "../research/types";

export interface CandidateRef {
  discovery: Discovery;
  candidate: IdeaCandidate;
  report: CandidateInsightReport;
  href: string;
}

function candidateBrief(discovery: Discovery, candidate: IdeaCandidate): DiscoveryBrief {
  const legacy = discovery as Partial<Discovery>;
  return {
    domain: legacy.domain || candidate.targetCustomer || candidate.title || "saved discovery",
    goal: (legacy.goal || "commercial") as DiscoveryGoal,
    capacity: (legacy.capacity || "ai-assisted") as DiscoveryCapacity,
    constraints: legacy.constraints,
  };
}

export async function getCandidateRef(discoveryId: string, candidateId: string): Promise<CandidateRef | null> {
  const discovery = await getDiscovery(discoveryId);
  if (!discovery) return null;
  const candidate = discovery.candidates.find((item) => item.id === candidateId);
  if (!candidate) return null;
  const brief = candidateBrief(discovery, candidate);
  const report = ensureCandidateInsightReport(brief, candidate, discovery.sources || []);
  return {
    discovery,
    candidate: { ...candidate, report },
    report,
    href: `/discover/${discovery.id}/ideas/${candidate.id}`,
  };
}

export async function listCandidateRefs(): Promise<CandidateRef[]> {
  const discoveries = await listDiscoveries();
  const refs: CandidateRef[] = [];
  for (const discovery of discoveries) {
    for (const candidate of discovery.candidates || []) {
      const ref = await getCandidateRef(discovery.id, candidate.id);
      if (ref) refs.push(ref);
    }
  }
  return refs;
}
