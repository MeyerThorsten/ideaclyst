import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { listCandidateRefs } from "../discovery/candidates";
import { pricingExperiments, renderPrivacyRisk } from "../report-tools/generators";
import { listValidationResults } from "./results";

export interface ValidationTask {
  id: string;
  candidateTitle: string;
  candidateHref: string;
  stage: "todo" | "running" | "evidence" | "passed" | "failed";
  title: string;
  script: string;
  successMetric: string;
  source: string;
}

function dataDir(): string {
  return process.env.IDEACLYST_DATA_DIR || ".ideaclyst";
}

function validationDir(): string {
  return join(process.cwd(), dataDir(), "validation");
}

async function writeAtomic(path: string, contents: string): Promise<void> {
  const tmp = `${path}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  await writeFile(tmp, contents, "utf8");
  await rename(tmp, path);
}

export async function listValidationTasks(): Promise<ValidationTask[]> {
  const refs = await listCandidateRefs();
  const tasks: ValidationTask[] = [];
  for (const ref of refs) {
    ref.report.executionPlan.nextActions.slice(0, 2).forEach((action, index) => {
      tasks.push({
        id: `${ref.discovery.id}:${ref.candidate.id}:next:${index}`,
        candidateTitle: ref.candidate.title,
        candidateHref: ref.href,
        stage: "todo",
        title: action,
        script: ref.report.executionPlan.acquisitionChannels[index]?.format || "Run a direct validation conversation.",
        successMetric: ref.report.executionPlan.successMetrics[index] || "A qualified buyer asks for a follow-up.",
        source: "report next action",
      });
    });
    pricingExperiments(ref).slice(0, 1).forEach((experiment, index) => {
      tasks.push({
        id: `${ref.discovery.id}:${ref.candidate.id}:pricing:${index}`,
        candidateTitle: ref.candidate.title,
        candidateHref: ref.href,
        stage: "running",
        title: experiment,
        script: "Offer the price before building more product.",
        successMetric: "A buyer accepts or gives a concrete objection.",
        source: "pricing experiment",
      });
    });
  }
  await persistValidation(tasks);
  return tasks;
}

export async function persistValidation(tasks: ValidationTask[]): Promise<void> {
  await mkdir(validationDir(), { recursive: true });
  await writeAtomic(join(validationDir(), "validation.json"), JSON.stringify({ generatedAt: new Date().toISOString(), tasks }, null, 2));
  await writeAtomic(join(validationDir(), "VALIDATION.md"), [
    "# Validation Sprint Board",
    "",
    ...tasks.map((task) => `## ${task.title}\n\n- Candidate: [${task.candidateTitle}](${task.candidateHref})\n- Stage: ${task.stage}\n- Source: ${task.source}\n- Success metric: ${task.successMetric}\n\n${task.script}\n`),
  ].join("\n"));
}

export async function validationAnalytics() {
  const [tasks, results] = await Promise.all([listValidationTasks(), listValidationResults()]);
  const byCandidate = new Map<string, ValidationTask[]>();
  for (const task of tasks) {
    byCandidate.set(task.candidateTitle, [...(byCandidate.get(task.candidateTitle) || []), task]);
  }
  return Array.from(byCandidate.entries()).map(([candidateTitle, candidateTasks]) => ({
    candidateTitle,
    candidateHref: candidateTasks[0]?.candidateHref || "#",
    total: candidateTasks.length,
    running: candidateTasks.filter((task) => task.stage === "running").length,
    evidence: candidateTasks.filter((task) => task.stage === "evidence").length,
    passRate: candidateTasks.length ? Math.round((candidateTasks.filter((task) => task.stage === "passed").length / candidateTasks.length) * 100) : 0,
    importedResults: results.length,
    importedScore: results.length ? Math.round(results.reduce((sum, result) => sum + result.score, 0) / results.length) : 0,
  }));
}

export async function privacyReviews() {
  const refs = await listCandidateRefs();
  return refs.map((ref) => ({
    title: ref.candidate.title,
    href: ref.href,
    markdown: renderPrivacyRisk(ref),
  }));
}
