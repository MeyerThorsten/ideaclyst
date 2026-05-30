/**
 * Small shared helpers: slug generation, run-id formatting, and a dependency-free
 * Markdown → HTML renderer. The renderer is intentionally minimal (headings,
 * tables, lists, code blocks, inline code/bold/italic/links, paragraphs) — enough
 * to make the council's Markdown read well without pulling in a heavy parser for v0.
 */

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "idea";
}

/**
 * `<timestamp(ms)>-<slug>-<rand>` — sortable, human-recognizable, and
 * collision-resistant. Millisecond precision is fixed-width so lexicographic
 * sort stays chronological; the random suffix makes same-millisecond collisions
 * astronomically unlikely (callers also guard against an existing directory).
 */
export function makeRunId(title: string): string {
  const ts = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.(\d+)Z$/, "$1"); // keep milliseconds, drop the dot and Z
  const rand = Math.random().toString(36).slice(2, 8);
  return `${ts}-${slugify(title)}-${rand}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Sanitize a Markdown link destination for use inside a double-quoted href.
 * Input has already been HTML-escaped for &/</> (see escapeHtml), but NOT for
 * quotes, and the scheme is unvalidated — both are XSS vectors when the Markdown
 * comes from untrusted model/scraped output. Returns null for unsafe schemes so
 * the link is dropped (text kept).
 */
function sanitizeHref(raw: string): string | null {
  const url = raw.trim();
  // Unescape &amp; only to test the scheme; the returned value stays escaped.
  const probe = url.replace(/&amp;/gi, "&").toLowerCase();
  const safe =
    /^https?:\/\//.test(probe) ||
    probe.startsWith("mailto:") ||
    probe.startsWith("/") ||
    probe.startsWith("#");
  if (!safe) return null; // reject javascript:, data:, vbscript:, etc.
  return url.replace(/"/g, "&quot;");
}

/** Inline formatting: code, bold, italic, links. Operates on already-escaped text. */
function renderInline(text: string): string {
  let out = text;
  // inline code first so its contents aren't further formatted
  out = out.replace(/`([^`]+)`/g, (_m, c) => `<code class="rounded bg-zinc-100 px-1 py-0.5 text-[0.85em] text-zinc-800">${c}</code>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-zinc-900">$1</strong>');
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label: string, url: string) => {
    const href = sanitizeHref(url);
    if (!href) return label; // unsafe link → keep the text, drop the href
    return `<a href="${href}" class="text-indigo-600 underline underline-offset-2 hover:text-indigo-500" target="_blank" rel="noreferrer">${label}</a>`;
  });
  return out;
}

function parseTableRow(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
  const cells = trimmed.slice(1, -1).split("|").map((cell) => cell.trim());
  return cells.length >= 2 ? cells : null;
}

function isTableSeparator(cells: string[]): boolean {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, "")));
}

function renderTable(headers: string[], rows: string[][]): string {
  const renderCell = (cell: string) => renderInline(escapeHtml(cell));
  const thead = headers
    .map((cell) => `<th class="px-3 py-2 text-left font-semibold text-zinc-800">${renderCell(cell)}</th>`)
    .join("");
  const tbody = rows
    .map((row) => {
      const cells = headers
        .map((_, index) => `<td class="px-3 py-2 align-top text-zinc-700">${renderCell(row[index] ?? "")}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return [
    '<div class="my-4 overflow-x-auto rounded-lg border border-zinc-200">',
    '<table class="min-w-full divide-y divide-zinc-200 text-sm">',
    `<thead class="bg-zinc-50"><tr>${thead}</tr></thead>`,
    `<tbody class="divide-y divide-zinc-100 bg-white">${tbody}</tbody>`,
    "</table>",
    "</div>",
  ].join("");
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

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
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

    // pipe tables: header row + separator row, followed by pipe rows
    const tableHeader = parseTableRow(line);
    const tableSeparator = tableHeader ? parseTableRow(lines[i + 1] ?? "") : null;
    if (
      tableHeader &&
      tableSeparator &&
      tableHeader.length === tableSeparator.length &&
      isTableSeparator(tableSeparator)
    ) {
      flushList();
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length) {
        const row = parseTableRow(lines[j]);
        if (!row) break;
        rows.push(row);
        j++;
      }
      html.push(renderTable(tableHeader, rows));
      i = j - 1;
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
