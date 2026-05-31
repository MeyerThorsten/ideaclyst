"use client";

import { useState } from "react";

import { Run } from "@/lib/runs/types";
import { renderMarkdown } from "@/lib/utils";

interface TabDef {
  key: string;
  label: string;
  value: string;
  unavailable?: boolean;
}

export default function ResultTabs({ run }: { run: Run }) {
  const o = run.outputs;
  const researchOff = run.includeResearch === false;
  const isWorking =
    run.status === "queued" ||
    run.status === "running" ||
    run.currentStep === "Refreshing research";
  const tabs: TabDef[] = [
    { key: "summary", label: "Summary", value: o.summary },
    { key: "researchFindings", label: "Research", value: o.researchFindings },
    {
      key: "researchToolkit",
      label: "Research Toolkit",
      value: researchOff
        ? "_Research toolkit is not available because web research was turned off for this run._"
        : o.researchToolkit,
      unavailable: researchOff,
    },
    {
      key: "founderBrief",
      label: "Founder Brief",
      value: researchOff
        ? "_Founder brief is not available because web research was turned off for this run._"
        : o.founderBrief,
      unavailable: researchOff,
    },
    { key: "evolutionDiff", label: "Diff", value: o.evolutionDiff },
    { key: "productStrategy", label: "Product Strategy", value: o.productStrategy },
    { key: "technicalArchitecture", label: "Technical Architecture", value: o.technicalArchitecture },
    { key: "mvpBacklog", label: "MVP Backlog", value: o.mvpBacklog },
    { key: "prd", label: "PRD", value: o.prd },
    { key: "risks", label: "Risks", value: o.risks },
    { key: "validationTests", label: "Validation Tests", value: o.validationTests },
    { key: "transcript", label: "Transcript", value: o.transcript },
    { key: "nextPrompts", label: "Next Prompts", value: o.nextPrompts },
  ];

  const [active, setActive] = useState(tabs[0].key);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white">
      <div className="flex flex-wrap gap-1 border-b border-zinc-200 p-2">
        {tabs.map((t) => {
          const ready = Boolean(t.value && t.value.trim());
          const pending = !ready && isWorking && !t.unavailable;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                active === t.key
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              {t.label}
              {pending ? (
                <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-zinc-300 align-middle" />
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="px-6 py-5">
        <article
          className="max-w-none text-[15px]"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(current.value) }}
        />
      </div>
    </div>
  );
}
