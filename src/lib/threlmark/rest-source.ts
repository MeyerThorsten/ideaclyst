import { buildGapMap } from "./gaps";
import { withPriority } from "./priority";
import { writeSuggestionToDisk } from "./writer";
import type { ThrelmarkSource } from "./source";
import type {
  ProjectRead, ProjectSummary, ThrelmarkBoard, ThrelmarkItem, ThrelmarkSuggestionFile,
} from "./types";

/**
 * Talks to a running Threlmark server. Read endpoints follow Threlmark's REST API
 * (GET /api/projects, GET /api/projects/[id]). Write-back posts to
 * /api/projects/[id]/suggestions if present; on any non-2xx it falls back to the
 * disk writer so a suggestion is never silently lost.
 */
export class RestSource implements ThrelmarkSource {
  constructor(private baseUrl: string, private dataDir?: string) {}

  private url(path: string): string {
    return `${this.baseUrl.replace(/\/+$/, "")}${path}`;
  }

  async listProjects(): Promise<ProjectSummary[]> {
    try {
      const res = await fetch(this.url("/api/projects"), { cache: "no-store" });
      if (!res.ok) return [];
      const data = (await res.json()) as { projects?: Array<Record<string, unknown>> };
      return (data.projects ?? []).map((p) => ({
        id: String(p.id ?? ""),
        name: String(p.name ?? p.id ?? ""),
        itemCount: typeof p.itemCount === "number" ? p.itemCount : 0,
        doneCount: typeof p.doneCount === "number" ? p.doneCount : 0,
        openCount: typeof p.openCount === "number" ? p.openCount : 0,
      })).filter((p) => p.id);
    } catch {
      return [];
    }
  }

  async readProject(id: string): Promise<ProjectRead | null> {
    try {
      const res = await fetch(this.url(`/api/projects/${encodeURIComponent(id)}`), { cache: "no-store" });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        project?: Record<string, unknown>;
        items?: ThrelmarkItem[];
        board?: ThrelmarkBoard;
      };
      if (!data.project) return null;
      const items = (data.items ?? []).map((it) => withPriority(it));
      items.sort((a, b) => b.priority - a.priority);
      const board = data.board ?? ({ lanes: { idea: [], ranked: [], development: [], done: [] } } as ThrelmarkBoard);
      return {
        project: data.project as unknown as ProjectRead["project"],
        items,
        board,
        gapMap: buildGapMap(items),
      };
    } catch {
      return null;
    }
  }

  async writeSuggestion(projectId: string, suggestion: ThrelmarkSuggestionFile): Promise<string> {
    try {
      const res = await fetch(this.url(`/api/projects/${encodeURIComponent(projectId)}/suggestions`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(suggestion),
      });
      if (res.ok) {
        // 2xx means the server stored it — never double-write to disk.
        const data = (await res.json().catch(() => ({}))) as { id?: string };
        return data.id ?? `rest-accepted-${Date.now()}`;
      }
      // (fall through to disk only on non-2xx)
    } catch {
      /* fall through to disk */
    }
    // Fallback: write straight to disk so the Inbox still sees it.
    return writeSuggestionToDisk(projectId, suggestion, this.dataDir);
  }
}
