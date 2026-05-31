import { renderMarkdown } from "@/lib/utils";

export default function MarkdownPanel({ markdown }: { markdown: string }) {
  return (
    <article
      className="max-w-none rounded-2xl border border-zinc-200 bg-white p-6 text-[15px]"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }}
    />
  );
}
