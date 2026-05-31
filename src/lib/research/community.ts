import { CandidateInsightReport, IdeaCandidate, ResearchSource } from "./types";

export interface CommunityDeepDive {
  communities: string[];
  repeatedPainPhrases: string[];
  moderationConstraints: string[];
  firstPostScripts: string[];
}

export function communityDeepDive(
  candidate: IdeaCandidate,
  report: CandidateInsightReport,
  sources: ResearchSource[],
): CommunityDeepDive {
  const communitySources = sources.filter((source) => ["forum", "community", "launch", "review"].includes(source.sourceType || ""));
  const communities = Array.from(new Set(communitySources.map((source) => source.sourceName || source.title || source.url))).slice(0, 6);
  const repeatedPainPhrases = [
    candidate.signal,
    ...report.executionPlan.painPoints,
    ...communitySources.map((source) => source.summary.split(/[.!?]/)[0]),
  ].filter((phrase): phrase is string => Boolean(phrase && phrase.trim())).slice(0, 6);
  return {
    communities,
    repeatedPainPhrases,
    moderationConstraints: [
      "Do not pitch first; ask about the workflow and current workaround.",
      "Quote only public source language and avoid copying private/community text into prompts.",
      "Label any low-confidence source before using it as proof.",
    ],
    firstPostScripts: report.executionPlan.acquisitionChannels.slice(0, 3).map((channel) =>
      `${channel.channel}: ${channel.format} Ask for examples before mentioning ${candidate.title}.`,
    ),
  };
}
