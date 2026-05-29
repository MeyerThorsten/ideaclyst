import Link from "next/link";

import { Run } from "@/lib/runs/types";
import StatusPill from "./status-pill";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function RunCard({ run }: { run: Run }) {
  return (
    <Link
      href={`/runs/${run.id}`}
      className="group block rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-zinc-900 group-hover:text-indigo-600">
          {run.title}
        </h3>
        <StatusPill status={run.status} />
      </div>
      <p className="mt-1.5 line-clamp-2 text-sm text-zinc-500">{run.idea}</p>
      <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
        <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-600 capitalize">
          {run.goal}
        </span>
        <span>·</span>
        <span>{formatDate(run.createdAt)}</span>
        {run.status === "running" && run.currentStep ? (
          <>
            <span>·</span>
            <span className="text-indigo-600">{run.currentStep}…</span>
          </>
        ) : null}
      </div>
    </Link>
  );
}
