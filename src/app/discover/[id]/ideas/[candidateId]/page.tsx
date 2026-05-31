import { notFound } from "next/navigation";

import CandidateReport from "@/components/candidate-report";
import { getDiscovery } from "@/lib/discovery/store";
import { getFounderProfile } from "@/lib/profile/store";
import { profileFitNotes } from "@/lib/profile/summary";
import { ensureCandidateInsightReport } from "@/lib/research/idea-reports";

export const dynamic = "force-dynamic";

export default async function CandidateReportPage({
  params,
}: {
  params: Promise<{ id: string; candidateId: string }>;
}) {
  const { id, candidateId } = await params;
  const [discovery, profile] = await Promise.all([getDiscovery(id), getFounderProfile()]);
  if (!discovery) notFound();

  const candidate = discovery.candidates.find((c) => c.id === candidateId);
  if (!candidate) notFound();

  const brief = {
    domain: discovery.domain,
    goal: discovery.goal,
    capacity: discovery.capacity,
    constraints: discovery.constraints,
  };
  const report = ensureCandidateInsightReport(brief, candidate, discovery.sources || []);

  return (
    <CandidateReport
      discoveryId={discovery.id}
      candidate={{ ...candidate, report }}
      report={report}
      profileNotes={profileFitNotes(profile)}
    />
  );
}
