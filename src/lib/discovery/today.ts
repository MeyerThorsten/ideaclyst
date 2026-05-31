import { getCandidateRef, listCandidateRefs } from "./candidates";

function daySeed(date = new Date()): number {
  return Number(date.toISOString().slice(0, 10).replace(/-/g, ""));
}

export async function ideaOfTheDay() {
  const refs = await listCandidateRefs();
  if (!refs.length) return null;
  const sorted = refs.sort((a, b) =>
    (b.candidate.confidence?.overall || 0) - (a.candidate.confidence?.overall || 0) ||
    a.candidate.title.localeCompare(b.candidate.title),
  );
  const index = daySeed() % sorted.length;
  return getCandidateRef(sorted[index].discovery.id, sorted[index].candidate.id);
}
