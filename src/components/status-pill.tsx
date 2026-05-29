import { RunStatus } from "@/lib/runs/types";

const STYLES: Record<RunStatus, { label: string; cls: string; dot: string }> = {
  queued: {
    label: "Queued",
    cls: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
  },
  running: {
    label: "Running",
    cls: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    dot: "bg-indigo-500 animate-pulse",
  },
  completed: {
    label: "Completed",
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  failed: {
    label: "Failed",
    cls: "bg-rose-50 text-rose-700 ring-rose-200",
    dot: "bg-rose-500",
  },
};

export default function StatusPill({ status }: { status: RunStatus }) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${s.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
