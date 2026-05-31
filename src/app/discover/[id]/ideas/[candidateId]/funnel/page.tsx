import Link from "next/link";
import { notFound } from "next/navigation";

import MarkdownPanel from "@/components/markdown-panel";
import { getCandidateRef } from "@/lib/discovery/candidates";
import { renderFunnel } from "@/lib/report-tools/generators";

export const dynamic = "force-dynamic";

export default async function FunnelPage({ params }: { params: Promise<{ id: string; candidateId: string }> }) {
  const { id, candidateId } = await params;
  const ref = await getCandidateRef(id, candidateId);
  if (!ref) notFound();

  return (
    <div className="space-y-6">
      <Link href={ref.href} className="text-sm text-zinc-500 hover:text-zinc-900">Back to report</Link>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Distribution</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">Minimum viable funnel</h1>
      </div>
      <MarkdownPanel markdown={renderFunnel(ref)} />
    </div>
  );
}
