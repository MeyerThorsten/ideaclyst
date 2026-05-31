import Link from "next/link";
import { notFound } from "next/navigation";

import MarkdownPanel from "@/components/markdown-panel";
import { getCandidateRef } from "@/lib/discovery/candidates";
import { projectTasks, renderPrdFromCandidate } from "@/lib/report-tools/generators";

export const dynamic = "force-dynamic";

export default async function ProjectCandidatePage({
  params,
}: {
  params: Promise<{ discoveryId: string; candidateId: string }>;
}) {
  const { discoveryId, candidateId } = await params;
  const ref = await getCandidateRef(discoveryId, candidateId);
  if (!ref) notFound();

  return (
    <div className="space-y-6">
      <Link href={ref.href} className="text-sm text-zinc-500 hover:text-zinc-900">Back to report</Link>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Build</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">Build-this-idea workspace</h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <MarkdownPanel markdown={renderPrdFromCandidate(ref)} />
        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-zinc-900">Project task queue</h2>
          <div className="mt-4 space-y-2">
            {projectTasks(ref).map((task) => (
              <div key={task} className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700 ring-1 ring-inset ring-zinc-200">
                {task}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
