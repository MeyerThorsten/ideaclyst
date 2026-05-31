import Link from "next/link";

import { listIdeaClusters } from "@/lib/clusters/store";

export const dynamic = "force-dynamic";

export default async function ClustersPage() {
  const clusters = await listIdeaClusters();
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Discovery</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">Idea cluster map</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
          Clusters are explainable groupings from local discovery and report text. No synthetic ideas are added.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {clusters.map((cluster) => (
          <section key={cluster.id} className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-zinc-900">{cluster.label}</h2>
            <p className="mt-1 text-xs text-zinc-500">{cluster.reason}</p>
            <div className="mt-4 space-y-2">
              {cluster.items.map((item) => (
                <Link key={item.href} href={item.href} className="block rounded-xl bg-zinc-50 p-3 text-sm ring-1 ring-inset ring-zinc-200 hover:bg-white">
                  <span className="font-semibold text-zinc-900">{item.title}</span>
                  <span className="mt-1 block text-xs text-zinc-500">{item.market}{item.score ? ` · ${item.score}/100` : ""}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
