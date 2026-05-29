/**
 * Small shared helpers: slug generation, run-id formatting, and a dependency-free
 * Markdown → HTML renderer. The renderer is intentionally minimal (headings,
 * lists, code blocks, inline code/bold/italic/links, paragraphs) — enough to make
 * the council's Markdown read well without pulling in a heavy parser for v0.
 */

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "idea";
}

/** `<timestamp>-<slug>` — sortable and human-recognizable. */
export function makeRunId(title: string): string {
  const ts = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "");
  return `${ts}-${slugify(title)}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Inline formatting: code, bold, italic, links. Operates on already-escaped text. */
function renderInline(text: string): string {
  let out = text;
  // inline code first so its contents aren't further formatted
  out = out.replace(/`([^`]+)`/g, (_m, c) => `<code class="rounded bg-zinc-100 px-1 py-0.5 text-[0.85em] text-zinc-800">${c}</code>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-zinc-900">$1</strong>');
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-indigo-600 underline underline-offset-2 hover:text-indigo-500" target="_blank" rel="noreferrer">$1</a>',
  );
  return out;
}

/**
 * Render a Markdown string to an HTML string. Not a full CommonMark parser —
 * handles the constructs the council actually emits.
 */
export function renderMarkdown(md: string): string {
  if (!md || !md.trim()) {
    return '<p class="text-zinc-400 italic">No content yet.</p>';
  }

  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];

  let inCode = false;
  let codeLang = "";
  let codeBuf: string[] = [];
  let listType: "ul" | "ol" | null = null;
  const listBuf: string[] = [];

  const flushList = () => {
    if (listType) {
      const cls =
        listType === "ul"
          ? "list-disc space-y-1 pl-6 text-zinc-700"
          : "list-decimal space-y-1 pl-6 text-zinc-700";
      html.push(`<${listType} class="${cls}">${listBuf.join("")}</${listType}>`);
      listBuf.length = 0;
      listType = null;
    }
  };

  for (const raw of lines) {
    const line = raw;

    // fenced code blocks
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      if (inCode) {
        html.push(
          `<pre class="my-3 overflow-x-auto rounded-lg bg-zinc-900 p-4 text-sm text-zinc-100"><code data-lang="${codeLang}">${escapeHtml(
            codeBuf.join("\n"),
          )}</code></pre>`,
        );
        inCode = false;
        codeBuf = [];
        codeLang = "";
      } else {
        flushList();
        inCode = true;
        codeLang = fence[1] || "";
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    // headings
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushList();
      const level = h[1].length;
      const sizes: Record<number, string> = {
        1: "text-2xl font-bold text-zinc-900 mt-6 mb-3",
        2: "text-xl font-semibold text-zinc-900 mt-5 mb-2",
        3: "text-lg font-semibold text-zinc-900 mt-4 mb-2",
        4: "text-base font-semibold text-zinc-800 mt-3 mb-1",
        5: "text-sm font-semibold text-zinc-800 mt-3 mb-1",
        6: "text-sm font-semibold text-zinc-600 mt-3 mb-1",
      };
      html.push(`<h${level} class="${sizes[level]}">${renderInline(escapeHtml(h[2]))}</h${level}>`);
      continue;
    }

    // list items
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ul || ol) {
      const wanted: "ul" | "ol" = ul ? "ul" : "ol";
      if (listType && listType !== wanted) flushList();
      listType = wanted;
      const content = (ul ? ul[1] : ol![1]) ?? "";
      listBuf.push(`<li>${renderInline(escapeHtml(content))}</li>`);
      continue;
    }

    // blank line ends a list / paragraph break
    if (!line.trim()) {
      flushList();
      continue;
    }

    // plain paragraph
    flushList();
    html.push(`<p class="my-2 leading-relaxed text-zinc-700">${renderInline(escapeHtml(line))}</p>`);
  }

  // close any open blocks
  if (inCode && codeBuf.length) {
    html.push(
      `<pre class="my-3 overflow-x-auto rounded-lg bg-zinc-900 p-4 text-sm text-zinc-100"><code>${escapeHtml(
        codeBuf.join("\n"),
      )}</code></pre>`,
    );
  }
  flushList();

  return html.join("\n");
}
