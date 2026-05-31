export function markdownDiff(previous: string, next: string, label: string): string {
  if (!previous.trim()) {
    return `## ${label}\n\nFirst pass; no previous artifact to compare.`;
  }
  const beforeLines = new Set(previous.split(/\n+/).map((line) => line.trim()).filter((line) => line.length > 24));
  const afterLines = next.split(/\n+/).map((line) => line.trim()).filter((line) => line.length > 24);
  const added = afterLines.filter((line) => !beforeLines.has(line)).slice(0, 8);
  return [
    `## ${label}`,
    "",
    added.length ? "### Added or materially changed" : "No material text changes detected.",
    ...added.map((line) => `- ${line}`),
  ].join("\n");
}
