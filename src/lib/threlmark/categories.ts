/** Threlmark's fixed category set. Unknown → "Build" (matches Threlmark's normalize). */
export const THRELMARK_CATEGORIES = [
  "Research", "Discovery", "Reports", "Trends", "Validation",
  "Build", "Distribution", "Operations", "UX", "Automation",
] as const;
export type ThrelmarkCategory = (typeof THRELMARK_CATEGORIES)[number];

export function toThrelmarkCategory(value: unknown): ThrelmarkCategory {
  return (THRELMARK_CATEGORIES as readonly string[]).includes(value as string)
    ? (value as ThrelmarkCategory)
    : "Build";
}
