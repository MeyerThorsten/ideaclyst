import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { CandidateRef } from "../discovery/candidates";
import {
  renderCandidateBuildPrompt,
  renderCandidateInsightReportMarkdown,
  renderCandidateOnePagerMarkdown,
  renderCandidateReviewPrompt,
} from "../research/idea-reports";
import { renderFunnel } from "../report-tools/generators";

export interface ExportPacket {
  folder: string;
  htmlPath: string;
  href: string;
}

function dataDir(): string {
  return process.env.IDEACLYST_DATA_DIR || ".ideaclyst";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function writeAtomic(path: string, contents: string): Promise<void> {
  const tmp = `${path}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  await writeFile(tmp, contents, "utf8");
  await rename(tmp, path);
}

function packetHtml(ref: CandidateRef): string {
  const candidate = { ...ref.candidate, report: ref.report };
  const sections = [
    ["Report", renderCandidateInsightReportMarkdown(candidate)],
    ["One-pager", renderCandidateOnePagerMarkdown(candidate)],
    ["Validation funnel", renderFunnel(ref)],
    ["Build prompt", renderCandidateBuildPrompt(candidate)],
    ["Review prompt", renderCandidateReviewPrompt(candidate)],
  ];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(ref.candidate.title)} - IdeaClyst packet</title>
<style>
body{font-family:Inter,system-ui,sans-serif;margin:0;background:#f6f7f9;color:#18181b;line-height:1.55}
main{max-width:980px;margin:0 auto;padding:40px 24px}
section{background:white;border:1px solid #e4e4e7;border-radius:14px;padding:24px;margin:16px 0}
pre{white-space:pre-wrap;font-family:ui-monospace,Menlo,monospace;font-size:13px;background:#f4f4f5;padding:16px;border-radius:10px;overflow:auto}
a{color:#4f46e5}
</style>
</head>
<body><main>
<p>IdeaClyst local export. All links are public source URLs or app-relative report links; no private machine paths are embedded.</p>
<h1>${escapeHtml(ref.candidate.title)}</h1>
${sections.map(([title, body]) => `<section><h2>${escapeHtml(title)}</h2><pre>${escapeHtml(body)}</pre></section>`).join("")}
</main></body></html>`;
}

export async function writeCandidatePacket(ref: CandidateRef): Promise<ExportPacket> {
  const folder = join(process.cwd(), dataDir(), "exports", `${ref.discovery.id}-${ref.candidate.id}`);
  await mkdir(folder, { recursive: true });
  const htmlPath = join(folder, "index.html");
  await writeAtomic(htmlPath, packetHtml(ref));
  await writeAtomic(join(folder, "REPORT.md"), renderCandidateInsightReportMarkdown({ ...ref.candidate, report: ref.report }));
  await writeAtomic(join(folder, "ONE_PAGER.md"), renderCandidateOnePagerMarkdown({ ...ref.candidate, report: ref.report }));
  await writeAtomic(join(folder, "VALIDATION_FUNNEL.md"), renderFunnel(ref));
  return {
    folder,
    htmlPath,
    href: `/discover/${ref.discovery.id}/ideas/${ref.candidate.id}/export`,
  };
}
