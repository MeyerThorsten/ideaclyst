import Link from "next/link";
import { notFound } from "next/navigation";

import { getCandidateRef } from "@/lib/discovery/candidates";
import { landingPageDraft } from "@/lib/report-tools/generators";

export const dynamic = "force-dynamic";

export default async function LandingDraftPage({
  params,
}: {
  params: Promise<{ discoveryId: string; candidateId: string }>;
}) {
  const { discoveryId, candidateId } = await params;
  const ref = await getCandidateRef(discoveryId, candidateId);
  if (!ref) notFound();
  const draft = landingPageDraft(ref);

  return (
    <div className="space-y-8">
      <Link href={ref.href} className="text-sm text-zinc-500 hover:text-zinc-900">Back to report</Link>
      <section className="rounded-3xl border border-zinc-200 bg-white px-6 py-12 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Landing draft</div>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-950">{draft.hero}</h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-600">{draft.subhead}</p>
          <a href="#cta" className="mt-6 inline-flex rounded-lg bg-zinc-900 px-5 py-3 text-sm font-semibold text-white">
            {draft.cta}
          </a>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Pain</h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">
            {draft.pains.map((pain) => <li key={pain}>{pain}</li>)}
          </ul>
        </section>
        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Proof</h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">
            {draft.proof.map((proof) => <li key={proof}>{proof}</li>)}
          </ul>
        </section>
        <section id="cta" className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Offer</h2>
          <p className="mt-3 text-lg font-semibold text-zinc-900">{draft.offer}</p>
          <p className="mt-3 text-sm text-zinc-600">Metric: {draft.metric}</p>
        </section>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-zinc-900">FAQ</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {draft.faqs.map((faq) => (
            <div key={faq.question} className="rounded-xl bg-zinc-50 p-4 ring-1 ring-inset ring-zinc-200">
              <div className="text-sm font-semibold text-zinc-900">{faq.question}</div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
