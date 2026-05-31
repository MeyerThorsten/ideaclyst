import Link from "next/link";
import { notFound } from "next/navigation";

import { getCandidateRef } from "@/lib/discovery/candidates";
import { writeCandidatePacket } from "@/lib/exports/packet";

export const dynamic = "force-dynamic";

export default async function ExportPacketPage({
  params,
}: {
  params: Promise<{ id: string; candidateId: string }>;
}) {
  const { id, candidateId } = await params;
  const ref = await getCandidateRef(id, candidateId);
  if (!ref) notFound();
  const packet = await writeCandidatePacket(ref);
  return (
    <div className="space-y-6">
      <Link href={ref.href} className="text-sm text-zinc-500 hover:text-zinc-900">Back to report</Link>
      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Export</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">Local share packet generated</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
          The packet is self-contained HTML plus Markdown artifacts under `.ideaclyst/exports`. The HTML itself avoids private machine paths.
        </p>
        <div className="mt-5 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600 ring-1 ring-inset ring-zinc-200">
          <div className="font-semibold text-zinc-900">Generated file</div>
          <div className="mt-1 break-all">{packet.htmlPath}</div>
        </div>
      </section>
    </div>
  );
}
