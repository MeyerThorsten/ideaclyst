import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { listCandidateRefs } from "../discovery/candidates";

export interface InterviewTarget {
  id: string;
  candidateTitle: string;
  candidateHref: string;
  persona: string;
  outreachPrompt: string;
  status: "target" | "contacted" | "interviewed";
  evidenceNote: string;
}

function dataDir(): string {
  return process.env.IDEACLYST_DATA_DIR || ".ideaclyst";
}

async function writeAtomic(path: string, contents: string): Promise<void> {
  const tmp = `${path}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  await writeFile(tmp, contents, "utf8");
  await rename(tmp, path);
}

export async function listInterviewTargets(): Promise<InterviewTarget[]> {
  const targets: InterviewTarget[] = [];
  for (const ref of await listCandidateRefs()) {
    for (const [index, persona] of ref.report.executionPlan.buyerPersonas.slice(0, 2).entries()) {
      targets.push({
        id: `${ref.discovery.id}:${ref.candidate.id}:${index}`,
        candidateTitle: ref.candidate.title,
        candidateHref: ref.href,
        persona,
        outreachPrompt: `Ask ${persona} about the last time they dealt with: ${ref.candidate.risk || ref.report.roast.verdict}`,
        status: "target",
        evidenceNote: "No interview evidence imported yet.",
      });
    }
  }
  const dir = join(process.cwd(), dataDir(), "interviews");
  await mkdir(dir, { recursive: true });
  await writeAtomic(join(dir, "interviews.json"), JSON.stringify({ generatedAt: new Date().toISOString(), targets }, null, 2));
  return targets;
}
