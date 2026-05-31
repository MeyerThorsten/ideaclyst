"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  renderCandidateBuildPrompt,
  renderCandidateInsightReportMarkdown,
  renderCandidateOnePagerMarkdown,
  renderCandidateReviewPrompt,
} from "@/lib/research/idea-reports";
import { confidenceLabel, freshnessLabel, isSyntheticSource, sourceConfidence } from "@/lib/evidence/scoring";
import { communityDeepDive } from "@/lib/research/community";
import { CandidateInsightReport, IdeaCandidate, InsightScore } from "@/lib/research/types";
import SaveToLibraryButton from "./save-to-library-button";

const COMPARE_STORAGE_KEY = "ideaclyst-compare-v1";

interface CompareEntry {
  discoveryId: string;
  candidate: IdeaCandidate;
  addedAt: string;
}

function ScoreCard({ score }: { score: InsightScore }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-900">{score.label}</div>
          <div className="mt-1 text-xs text-zinc-500">{score.rating}</div>
        </div>
        <div className="text-xl font-bold text-zinc-900">{score.score}/10</div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${score.score * 10}%` }} />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600">{score.detail}</p>
    </div>
  );
}

function Section({
  title,
  eyebrow,
  children,
  id,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="rounded-2xl border border-zinc-200 bg-white p-6">
      {eyebrow ? <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">{eyebrow}</div> : null}
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm text-zinc-600">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-900" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function CandidateReport({
  discoveryId,
  candidate,
  report,
  profileNotes = [],
}: {
  discoveryId: string;
  candidate: IdeaCandidate;
  report: CandidateInsightReport;
  profileNotes?: string[];
}) {
  const router = useRouter();
  const [promoting, setPromoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const candidateWithReport = { ...candidate, report };
  const opportunityScore = report.scores.find((score) => score.label === "Opportunity")?.score;
  const keywordSource = report.keywordAnalysis.source || "legacy report artifact";
  const keywordFreshness = report.keywordAnalysis.freshness || "not recorded in this saved report";
  const community = communityDeepDive(candidate, report, report.sources);

  async function promote() {
    setPromoting(true);
    setError(null);
    try {
      const res = await fetch(`/api/discoveries/${discoveryId}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: candidate.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to promote");
      router.push(`/runs/${data.runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPromoting(false);
    }
  }

  async function copyText(label: string, text: string) {
    setNotice(null);
    try {
      await navigator.clipboard.writeText(text);
      setNotice(`${label} copied`);
    } catch {
      setNotice("Copy failed");
    }
  }

  async function logDecision(type: "promoted" | "parked" | "killed" | "validated") {
    setNotice(null);
    try {
      const res = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: candidate.title,
          href: `/discover/${discoveryId}/ideas/${candidate.id}`,
          evidence: report.proofSignals[0]?.detail || report.oneLine,
          rationale: `${type} from candidate report. ${report.roast.verdict}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to log decision");
      setNotice(`${type} decision logged`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Decision log failed");
    }
  }

  async function refreshReport() {
    setNotice(null);
    try {
      const res = await fetch(`/api/discoveries/${discoveryId}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: candidate.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to refresh report");
      setNotice(`Report refreshed: ${data.diff?.summary || "version saved"}`);
      router.refresh();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Report refresh failed");
    }
  }

  function readCompareEntries(): CompareEntry[] {
    try {
      const raw = localStorage.getItem(COMPARE_STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((entry): entry is CompareEntry => {
        if (!entry || typeof entry !== "object") return false;
        const value = entry as Partial<CompareEntry>;
        return typeof value.discoveryId === "string" && Boolean(value.candidate?.id);
      });
    } catch {
      return [];
    }
  }

  function addToCompare() {
    const current = readCompareEntries();
    const next = [
      { discoveryId, candidate: candidateWithReport, addedAt: new Date().toISOString() },
      ...current.filter((entry) => entry.discoveryId !== discoveryId || entry.candidate.id !== candidate.id),
    ].slice(0, 8);
    localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(next, null, 2));
    setNotice("Added to compare");
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/discover/${discoveryId}`} className="text-sm text-zinc-500 hover:text-zinc-900">
          Back to discovery
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Full idea report</div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">{candidate.title}</h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">{report.oneLine}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SaveToLibraryButton
              item={{
                id: `report:${discoveryId}:${candidate.id}`,
                type: "report",
                title: candidate.title,
                description: report.oneLine,
                href: `/discover/${discoveryId}/ideas/${candidate.id}`,
                sourceId: candidate.id,
                parentId: discoveryId,
                score: opportunityScore ? opportunityScore * 10 : candidate.confidence?.overall,
                tags: [
                  "full report",
                  candidate.commercial ? `commercial:${candidate.commercial}` : "",
                  candidate.buildEffort ? `build:${candidate.buildEffort}` : "",
                  candidate.targetCustomer || "",
                ].filter(Boolean),
                metadata: {
                  generatedAt: report.generatedAt,
                  founderFit: report.founderFit.score,
                  roast: report.roast.verdict,
                },
              }}
            />
            <button
              type="button"
              onClick={addToCompare}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Add to compare
            </button>
            <button
              type="button"
              onClick={promote}
              disabled={promoting}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {promoting ? "Convening..." : "Promote to council"}
            </button>
            {error ? <span className="text-xs text-rose-600">{error}</span> : null}
            {notice ? <span className="text-xs text-emerald-700">{notice}</span> : null}
          </div>
        </div>
      </div>

      <Section title="Exports & Handoff" eyebrow="Portable">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {[
            ["Copy Markdown", renderCandidateInsightReportMarkdown(candidateWithReport)],
            ["Copy JSON", JSON.stringify({ discoveryId, candidate: candidateWithReport, report, exportedAt: new Date().toISOString() }, null, 2)],
            ["Copy One-Pager", renderCandidateOnePagerMarkdown(candidateWithReport)],
            ["Copy Build Prompt", renderCandidateBuildPrompt(candidateWithReport)],
            ["Copy Review Prompt", renderCandidateReviewPrompt(candidateWithReport)],
          ].map(([label, text]) => (
            <button
              key={label}
              type="button"
              onClick={() => copyText(label, text)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-left text-sm font-semibold text-zinc-900 transition hover:border-zinc-300 hover:bg-white"
            >
              {label}
              <span className="mt-1 block text-xs font-normal leading-relaxed text-zinc-500">
                {label === "Copy Build Prompt"
                  ? "Implementation-ready Claude/Codex brief"
                  : label === "Copy Review Prompt"
                    ? "Review-only prompt with invariants"
                    : "Portable report artifact"}
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Build & Validate Workspaces" eyebrow="Next tools">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Funnel", `/discover/${discoveryId}/ideas/${candidate.id}/funnel`, "Landing copy, lead magnet, outreach, and first channel."],
            ["Landing", `/landing/${discoveryId}/${candidate.id}`, "Rendered local landing page draft and validation CTA."],
            ["Personas", `/discover/${discoveryId}/ideas/${candidate.id}/personas`, "Skeptical buyer simulations grounded in this report."],
            ["Advisor", `/discover/${discoveryId}/ideas/${candidate.id}/chat`, "Report-grounded Q&A starters with unknowns labeled."],
            ["Project", `/projects/${discoveryId}/${candidate.id}`, "MVP spec, tasks, validation sprint, and handoff packet."],
            ["Share", `/discover/${discoveryId}/ideas/${candidate.id}/export`, "Self-contained local HTML packet."],
            ["Versions", `/discover/${discoveryId}/ideas/${candidate.id}/versions`, "Report snapshots and regeneration diffs."],
          ].map(([label, href, copy]) => (
            <Link
              key={label}
              href={href}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm font-semibold text-zinc-900 transition hover:border-zinc-300 hover:bg-white"
            >
              {label}
              <span className="mt-1 block text-xs font-normal leading-relaxed text-zinc-500">{copy}</span>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Report Operations" eyebrow="Audit">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={refreshReport} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">
            Rerun report only
          </button>
          {(["promoted", "validated", "parked", "killed"] as const).map((type) => (
            <button key={type} type="button" onClick={() => logDecision(type)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium capitalize text-zinc-700 transition hover:bg-zinc-50">
              Log {type}
            </button>
          ))}
          <Link href="/decisions" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">
            View decision log
          </Link>
        </div>
      </Section>

      {profileNotes.length ? (
        <Section title="Founder Profile Lens" eyebrow="Personal fit">
          <div className="grid gap-3 sm:grid-cols-2">
            {profileNotes.map((note) => (
              <div key={note} className="rounded-xl bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-600 ring-1 ring-inset ring-zinc-200">
                {note}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {report.scores.map((score) => (
          <ScoreCard key={score.label} score={score} />
        ))}
      </div>

      <Section title="Business Fit" eyebrow="Market">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["Revenue potential", report.businessFit.revenuePotential],
            ["Execution difficulty", report.businessFit.executionDifficulty],
            ["Go-to-market", report.businessFit.goToMarket],
            ["Right for you", report.businessFit.founderFit],
          ].map(([label, body]) => (
            <div key={label} className="rounded-xl bg-zinc-50 p-4 ring-1 ring-inset ring-zinc-200">
              <div className="text-sm font-semibold text-zinc-900">{label}</div>
              <p className="mt-1 text-sm leading-relaxed text-zinc-600">{body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Offer Ladder" eyebrow="Monetization">
        <div className="grid gap-3 md:grid-cols-5">
          {report.valueLadder.map((stage, index) => (
            <div key={stage.stage} className="rounded-xl border border-zinc-200 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{index + 1}. {stage.label}</div>
              <h3 className="mt-2 text-sm font-semibold text-zinc-900">{stage.offer}</h3>
              <div className="mt-1 text-xs font-medium text-zinc-500">{stage.price}</div>
              <p className="mt-3 text-xs leading-relaxed text-zinc-600">{stage.valueProvided}</p>
              <p className="mt-2 text-xs text-zinc-500">{stage.goal}</p>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Why Now" eyebrow="Timing">
          <div className="space-y-3">
            {report.whyNow.map((factor) => (
              <div key={factor.label} className="rounded-xl border border-zinc-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">{factor.label}</h3>
                    <p className="mt-1 text-sm text-zinc-600">{factor.signal}</p>
                  </div>
                  <span className="text-sm font-bold text-zinc-900">{factor.score}/10</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">{factor.detail}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Proof & Signals" eyebrow="Evidence">
          <div className="space-y-3">
            {report.proofSignals.map((signal) => (
              <div key={`${signal.category}-${signal.title}`} className="rounded-xl border border-zinc-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">{signal.category}: {signal.title}</h3>
                    <p className="mt-1 text-sm text-zinc-600">{signal.detail}</p>
                  </div>
                  <span className="text-sm font-bold text-zinc-900">{signal.score}/10</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section title="Already-Built Check" eyebrow="Competition">
        {report.existingProducts?.length ? (
          <div className="grid gap-2">
            {report.existingProducts.map((match) => (
              <a key={`${match.url}-${match.title}`} href={match.url} target="_blank" rel="noreferrer" className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50">
                <span className="font-medium text-zinc-900">{match.title}</span>
                <span className="ml-2 text-xs text-zinc-400">{match.strength} · {match.sourceName}</span>
                <span className="mt-1 block text-xs text-zinc-500">{match.rationale}</span>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-zinc-600">
            No source-backed product match was recorded. Treat this as unknown rather than proof the idea is novel.
          </p>
        )}
      </Section>

      <Section title="Market Gap" eyebrow="Positioning">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900">Underserved segments</h3>
            <Bullets items={report.marketGap.underservedSegments} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900">Feature gaps</h3>
            <Bullets items={report.marketGap.featureGaps} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900">Differentiation levers</h3>
            <Bullets items={report.marketGap.differentiationLevers} />
          </div>
        </div>
      </Section>

      <Section title="Execution Plan" eyebrow="Build">
        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-xl bg-zinc-50 p-4 ring-1 ring-inset ring-zinc-200">
            <dl className="space-y-3 text-sm">
              <div><dt className="font-semibold text-zinc-900">Business type</dt><dd className="text-zinc-600">{report.executionPlan.businessType}</dd></div>
              <div><dt className="font-semibold text-zinc-900">Timeline</dt><dd className="text-zinc-600">{report.executionPlan.timeline}</dd></div>
              <div><dt className="font-semibold text-zinc-900">Budget</dt><dd className="text-zinc-600">{report.executionPlan.budget}</dd></div>
              <div><dt className="font-semibold text-zinc-900">MVP approach</dt><dd className="text-zinc-600">{report.executionPlan.mvpApproach}</dd></div>
            </dl>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {report.executionPlan.acquisitionChannels.map((channel) => (
              <div key={channel.channel} className="rounded-xl border border-zinc-200 p-4">
                <h3 className="text-sm font-semibold text-zinc-900">{channel.channel}</h3>
                <p className="mt-1 text-xs text-zinc-500">{channel.cadence}</p>
                <p className="mt-2 text-sm text-zinc-600">{channel.why}</p>
                <p className="mt-2 text-xs text-zinc-500">{channel.format}</p>
                <p className="mt-2 text-xs font-medium text-zinc-700">{channel.targetMetric}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div><h3 className="mb-2 text-sm font-semibold text-zinc-900">Milestones</h3><Bullets items={report.executionPlan.milestones} /></div>
          <div><h3 className="mb-2 text-sm font-semibold text-zinc-900">Success metrics</h3><Bullets items={report.executionPlan.successMetrics} /></div>
          <div><h3 className="mb-2 text-sm font-semibold text-zinc-900">Next actions</h3><Bullets items={report.executionPlan.nextActions} /></div>
        </div>
      </Section>

      <Section title="Framework Fit" eyebrow="Analysis">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 p-4">
            <h3 className="text-sm font-semibold text-zinc-900">Value equation</h3>
            <div className="mt-3 space-y-2 text-sm text-zinc-600">
              {[report.frameworks.valueEquation.dreamOutcome, report.frameworks.valueEquation.perceivedLikelihood, report.frameworks.valueEquation.timeDelay, report.frameworks.valueEquation.effortAndSacrifice].map((s) => (
                <div key={s.label} className="flex justify-between gap-3"><span>{s.label}</span><b className="text-zinc-900">{s.score}/10</b></div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 p-4">
            <h3 className="text-sm font-semibold text-zinc-900">Market matrix</h3>
            <p className="mt-2 text-sm text-zinc-600">{report.frameworks.marketMatrix.quadrant}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-500">
              <div><dt>Uniqueness</dt><dd className="font-semibold text-zinc-900">{report.frameworks.marketMatrix.uniqueness}/10</dd></div>
              <div><dt>Customer value</dt><dd className="font-semibold text-zinc-900">{report.frameworks.marketMatrix.customerValue}/10</dd></div>
            </dl>
          </div>
          <div className="rounded-xl border border-zinc-200 p-4">
            <h3 className="text-sm font-semibold text-zinc-900">Audience-Community-Product</h3>
            <div className="mt-3 space-y-2 text-sm text-zinc-600">
              {[report.frameworks.acp.audience, report.frameworks.acp.community, report.frameworks.acp.product].map((s) => (
                <div key={s.label} className="flex justify-between gap-3"><span>{s.label}</span><b className="text-zinc-900">{s.score}/10</b></div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Community Signals" eyebrow="Channels">
          <div className="space-y-3">
            {report.communitySignals.map((signal) => (
              <div key={signal.channel} className="rounded-xl border border-zinc-200 p-4">
                <div className="flex justify-between gap-3 text-sm font-semibold text-zinc-900">
                  <span>{signal.channel}</span>
                  <span>{signal.count}</span>
                </div>
                <p className="mt-2 text-sm text-zinc-600">{signal.signal}</p>
                <p className="mt-2 text-xs text-zinc-500">{signal.firstMove}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900">Repeated pain phrases</h3>
              <Bullets items={community.repeatedPainPhrases} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900">First-post scripts</h3>
              <Bullets items={community.firstPostScripts} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900">Communities</h3>
              <Bullets items={community.communities.length ? community.communities : ["No source-backed communities recorded yet."]} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900">Moderation constraints</h3>
              <Bullets items={community.moderationConstraints} />
            </div>
          </div>
        </Section>

      <Section title="Keyword Intelligence" eyebrow="Demand">
        <p className="text-sm leading-relaxed text-zinc-600">{report.keywordAnalysis.summary}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
          <span className="rounded-full bg-zinc-100 px-2 py-1 ring-1 ring-inset ring-zinc-200">
            Source: {keywordSource}
          </span>
          <span className="rounded-full bg-zinc-100 px-2 py-1 ring-1 ring-inset ring-zinc-200">
            Freshness: {keywordFreshness}
          </span>
        </div>
        <div className="mt-4 grid gap-3">
            {[
              ["Fastest growing", report.keywordAnalysis.fastestGrowing],
              ["Highest volume", report.keywordAnalysis.highestVolume],
              ["Most relevant", report.keywordAnalysis.mostRelevant],
            ].map(([label, keywords]) => (
              <div key={label as string} className="rounded-xl border border-zinc-200 p-4">
                <h3 className="text-sm font-semibold text-zinc-900">{label as string}</h3>
                <div className="mt-3 grid gap-2">
                  {(keywords as CandidateInsightReport["keywordAnalysis"]["mostRelevant"]).map((keyword) => (
                    <div key={`${label}-${keyword.keyword}`} className="grid grid-cols-[1fr_auto_auto] gap-2 text-xs text-zinc-600">
                      <span className="font-medium text-zinc-900">{keyword.keyword}</span>
                      <span>{keyword.volume}</span>
                      <span>{keyword.growth}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Founder Fit" eyebrow="You">
          <div className="rounded-xl bg-zinc-50 p-4 ring-1 ring-inset ring-zinc-200">
            <div className="text-2xl font-bold text-zinc-900">{report.founderFit.score}/10</div>
            <p className="mt-1 text-sm text-zinc-600">{report.founderFit.idealFor}</p>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><h3 className="mb-2 text-sm font-semibold text-zinc-900">Advantages</h3><Bullets items={report.founderFit.advantages} /></div>
            <div><h3 className="mb-2 text-sm font-semibold text-zinc-900">Gaps</h3><Bullets items={report.founderFit.gaps} /></div>
          </div>
        </Section>

        <Section title="Roast" eyebrow="Critique" id="roast">
          <p className="text-sm font-medium text-zinc-900">{report.roast.verdict}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><h3 className="mb-2 text-sm font-semibold text-zinc-900">Blind spots</h3><Bullets items={report.roast.blindSpots} /></div>
            <div><h3 className="mb-2 text-sm font-semibold text-zinc-900">Hard questions</h3><Bullets items={report.roast.hardQuestions} /></div>
          </div>
        </Section>
      </div>

      {report.sources.length ? (
        <Section title="Sources" eyebrow="Evidence">
          <div className="grid gap-2">
            {report.sources.map((source) => {
              const confidenceScore = sourceConfidence(source);
              const synthetic = isSyntheticSource(source);
              return (
              <a
                key={`${source.url}-${source.title}`}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                <span className="font-medium text-zinc-900">{source.title || source.url}</span>
                <span className="ml-2 text-xs text-zinc-400">{source.sourceType ? SOURCE_LABELS[source.sourceType] : "source"}</span>
                <span className="ml-2 text-xs text-zinc-400">{confidenceLabel(confidenceScore)} · {freshnessLabel(report.generatedAt)}</span>
                {synthetic ? <span className="ml-2 text-xs font-medium text-amber-700">synthetic/offline</span> : null}
              </a>
              );
            })}
          </div>
        </Section>
      ) : null}
    </div>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  search: "Search demand",
  competitor: "Competitor",
  forum: "Forum",
  launch: "Launch",
  code: "Code",
  review: "Review",
  pricing: "Pricing",
  community: "Community",
  docs: "Docs",
};
