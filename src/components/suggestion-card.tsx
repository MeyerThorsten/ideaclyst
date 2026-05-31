"use client";

interface SuggestionView {
  id: string;
  kind: "feature" | "spinoff" | "service";
  title: string;
  description: string;
  category: string;
  impact: number;
  evidence: number;
  fit: number;
  effort: number;
  acceptance: string[];
  rationale: string;
  sources: { title: string; url: string }[];
  sentSuggestionId?: string;
}

function priority(s: SuggestionView): number {
  return Math.max(0, Math.round(s.impact * 3 + s.evidence * 2 + s.fit * 2 - s.effort * 1.5));
}

export function SuggestionCard({
  s,
  checked,
  onToggle,
}: {
  s: SuggestionView;
  checked: boolean;
  onToggle: (id: string) => void;
}) {
  const sent = Boolean(s.sentSuggestionId);
  return (
    <div
      className={`flex flex-col rounded-2xl border p-4 transition ${
        sent
          ? "border-emerald-200 bg-emerald-50/60"
          : "border-zinc-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          className="mt-1 shrink-0 cursor-pointer rounded accent-zinc-900"
          checked={checked}
          disabled={sent}
          onChange={() => onToggle(s.id)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold leading-snug text-zinc-900">{s.title}</h3>
            <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 ring-1 ring-inset ring-zinc-200">
              prio {priority(s)}
            </span>
          </div>
          <span className="mt-1 inline-block rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-100">
            {s.category}
          </span>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">{s.description}</p>
          {s.rationale ? (
            <p className="mt-2 text-xs italic text-zinc-500">Why now: {s.rationale}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-zinc-400">
            <span>impact {s.impact}</span>
            <span>evidence {s.evidence}</span>
            <span>fit {s.fit}</span>
            <span>effort {s.effort}</span>
          </div>
          {s.acceptance.length > 0 ? (
            <ul className="mt-2 list-disc pl-4 text-xs text-zinc-500 space-y-0.5">
              {s.acceptance.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          ) : null}
          {s.sources.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {s.sources.map((src) => (
                <a
                  key={src.url}
                  href={src.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-600 underline underline-offset-2 hover:text-indigo-500"
                >
                  {src.title.slice(0, 40) || "source"} ↗
                </a>
              ))}
            </div>
          ) : null}
          {sent ? (
            <p className="mt-3 text-xs font-semibold text-emerald-700">✓ sent to Threlmark</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
