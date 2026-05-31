import Link from "next/link";

import { listValidationTasks, privacyReviews } from "@/lib/validation/store";

export const dynamic = "force-dynamic";

export default async function ValidationPage() {
  const [tasks, riskReviews] = await Promise.all([listValidationTasks(), privacyReviews()]);
  const lanes = ["todo", "running", "evidence", "passed", "failed"] as const;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Validation</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">Validation sprint board</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
          Generated from real saved candidate reports. Tasks persist to `.ideaclyst/validation` for audit.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/validation/import" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">
          Import results
        </Link>
        <Link href="/validation/analytics" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">
          View analytics
        </Link>
        <Link href="/interviews" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">
          Interviews
        </Link>
      </div>
      <div className="grid gap-3 lg:grid-cols-5">
        {lanes.map((lane) => (
          <section key={lane} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{lane}</h2>
            <div className="mt-3 space-y-2">
              {tasks.filter((task) => task.stage === lane).map((task) => (
                <Link key={task.id} href={task.candidateHref} className="block rounded-xl bg-zinc-50 p-3 text-sm ring-1 ring-inset ring-zinc-200 hover:bg-white">
                  <span className="font-semibold text-zinc-900">{task.title}</span>
                  <span className="mt-1 block text-xs text-zinc-500">{task.candidateTitle}</span>
                  <span className="mt-2 block text-xs text-zinc-600">{task.successMetric}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-zinc-900">Privacy and compliance risk review</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {riskReviews.slice(0, 6).map((review) => (
            <Link key={review.href} href={review.href} className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600 ring-1 ring-inset ring-zinc-200 hover:bg-white">
              <span className="font-semibold text-zinc-900">{review.title}</span>
              <span className="mt-2 block whitespace-pre-line text-xs">{review.markdown.split("\n").slice(2, 7).join("\n")}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
