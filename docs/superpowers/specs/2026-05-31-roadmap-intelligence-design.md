# Roadmap Intelligence — Design Spec

**Date:** 2026-05-31
**Status:** Approved (design); pending implementation plan
**Mode:** live + strict (real data only, never mock)
**Pipeline:** Approach B (three research lanes)

> A human-readable HTML rendering of this spec lives at `plans/roadmap-intelligence-design.html`
> (local-only). This Markdown file is the source of truth.

## 1. Goal & context

A new **Roadmap Intelligence** capability in IdeaClyst, parallel to Runs and Discovery.

IdeaClyst is the local-first Next.js app (Claude+Codex council) that turns ideas into founder
plans, with surfagent web research (live + strict; always real data). **Threlmark** is a separate
local tool that stores each project's roadmap as JSON on disk under `~/.threlmark`.

This feature lets IdeaClyst **read** a Threlmark project's roadmap and, grounded in **real web
research**, produce three things: **new feature suggestions**, **spin-off products**, and
**services** — each scored like a Threlmark `RoadmapItem`, each citing real sources with a
why-now. The user reviews them in IdeaClyst and sends the chosen ones back into Threlmark's Inbox.

**Precondition met:** Threlmark already runs and has real data on disk —
`~/.threlmark/projects/ideaclyst/` holds 48 real roadmap cards. We build and verify against reality.

## 2. Decisions

| Question | Decision |
|---|---|
| How suggestions reach the Inbox | **① Review, then send picks.** Show with score + sources in IdeaClyst; only selected ones are written. |
| Generation pipeline | **Approach B** — three research lanes (Features / Spin-offs / Services), each independently grounded in real sources. |
| Suggestions per run | **Selectable in the form** (N per kind), default compact. |
| Data access | **Build both** (disk + REST) behind a source abstraction, configurable via a **Settings page**. **Disk is the default.** |
| Suggestion category | **Agent picks** from Threlmark's 10 fixed categories (fallback "Build"). |
| Target project on send | **Selectable** (default = analyzed project; otherwise `targetProjectId`). |
| "Promote to council" (prompt step 4) | **Deferred to v2.** |

## 3. Finding: real Threlmark format ≠ stale contract

Reading the real on-disk files showed Threlmark diverged from the old data contract when it was
built. The reader/writer targets **reality**, and we update `plans/threlmark-data-contract.md`
to match.

| Contract doc said | Threlmark actually writes |
|---|---|
| `roadmap.json` = `{ items: [] }` | **No** `roadmap.json` — one file per card in `items/<id>.json`, plus `board.json` holding lane order. |
| `project.json` has `summary` | `project.json` has `description?` (optional), `repoPath`, `color`, `slug`, `status` — no `summary`. |
| Suggestion = nested `{ item, kind, rationale, sources }` | **Flat**, item-shaped — only `source`+`title` required; unknown keys preserved. |

**Round-trip works:** Threlmark's Inbox + accept/dismiss is already fully built, can accept a
suggestion into a *different* project (`targetProjectId`), and preserves unknown keys — so our
provenance (`kind`/`rationale`/`sources`/`generatedAt`) survives and IdeaClyst can read it back.

The real Threlmark suggestion shape (from `threlmark/src/lib/schema/types.ts`): required
`source` + `title`; optional `description`, `category`, `impact`, `evidence`, `fit`, `effort`,
`files`, `acceptance[]`, `targetProjectId`, `createdAt`; unknown keys preserved (`[extra]: unknown`).
`accept` maps title/category/impact/evidence/fit/effort/description/files/acceptance/source into a
new item. Priority is **computed, never stored**: `max(0, round(impact*3 + evidence*2 + fit*2 - effort*1.5))`.
Categories (fallback "Build"): Research, Discovery, Reports, Trends, Validation, Build,
Distribution, Operations, UX, Automation. Lanes/status: idea, ranked, development, done.

## 4. Architecture & modules

Own local-first flow: disk = truth, fire-and-forget + 1.5s polling — like Runs/Discovery.

```
src/lib/threlmark/
  types.ts        # real Threlmark shapes (Project, Board, RoadmapItem, Suggestion) + summaries
  paths.ts        # dataRoot() = ENV | settings | ~/.threlmark; project/board/items/suggestions paths
  source.ts       # interface ThrelmarkSource { listProjects, readProject, writeSuggestion }
  disk-source.ts  # reads/writes JSON directly (DEFAULT)
  rest-source.ts  # talks to Threlmark's REST API
  reader.ts       # READ-ONLY helpers: items + board -> RoadmapItem[] with computed priority
  writer.ts       # writes ONLY suggestions/<id>.json (atomic), flat + provenance extras
  priority.ts     # priority() verbatim from Threlmark
  gaps.ts         # deterministic coverage/gap summary (categories, lanes, done vs missing)

src/lib/settings/store.ts   # .ideaclyst/settings.json { roadmapSource, dataDir?, baseUrl? }

src/lib/roadmap/            # IdeaClyst's own analysis state (separate from Threlmark)
  types.ts        # RoadmapAnalysis, RoadmapSuggestion, status
  store.ts        # .ideaclyst/roadmap/<analysisId>/ (analysis.json + SUGGESTIONS.md), atomic
  orchestrator.ts # startAnalysis(): 3 research lanes (Approach B), persisted progressively

src/app/roadmap/page.tsx            # picker + form
src/app/roadmap/[id]/page.tsx       # review view (polling)
src/app/settings/page.tsx           # configure source + test connection
src/app/api/roadmap/route.ts            # GET projects / POST create + startAnalysis
src/app/api/roadmap/[id]/route.ts       # GET polled
src/app/api/roadmap/[id]/send/route.ts  # POST {suggestionIds[], targetProjectId?} -> writer
src/app/api/settings/route.ts           # GET/PUT settings, POST test-connection
src/components/roadmap-form.tsx, suggestion-card.tsx, project-picker.tsx, settings-form.tsx
src/components/app-shell.tsx        # + "Roadmap" and "Settings" links
```

**Separation of concerns:** `src/lib/threlmark/*` is the only place that touches Threlmark data —
read-only except `writer.ts` (writes only `suggestions/`). `src/lib/roadmap/*` is IdeaClyst's own
state in `.ideaclyst/`.

## 5. Data layer — real format

### Reading (reader.ts / disk-source.ts)
- `listProjects()` → scans `<dataRoot>/projects/*/project.json` (tolerates broken/missing entries).
- `readProject(id)` → `project.json` + `board.json` + `items/*.json`; computes `priority` per item;
  builds `gapMap`.
- No `summary` → use `description` + `name` + `repoPath`; if absent, derive context from item
  titles/categories.

### Writing (writer.ts) — flat suggestion file the Inbox reads directly
```jsonc
{
  "source": "ideaclyst",            // required
  "title": "...",                   // required
  "category": "Discovery",          // from Threlmark's fixed list, else -> "Build"
  "impact": 4, "evidence": 4, "fit": 5, "effort": 3,
  "description": "...",
  "files": "",
  "acceptance": ["...", "..."],
  "targetProjectId": "other-app",   // optional, only when target != analyzed project
  // provenance as extra keys (Threlmark preserves them, Inbox ignores them):
  "kind": "feature | spinoff | service",
  "rationale": "why-now in 1-2 sentences",
  "sources": [{ "title": "...", "url": "https://..." }],
  "generatedAt": "ISO"
}
```
- File id: `<timestamp>-<slug>-<rand>` (collision-free, never overwrites).
- Atomic write (temp + rename) into `<dataRoot>/projects/<id>/suggestions/`.

## 6. Generation pipeline — Approach B

`roadmap/orchestrator.ts → startAnalysis(id)` fire-and-forget; each lane persists progressively.

Flow: `readProject + gapMap` → 3 lanes → `webSearch + recon` → `runAgent (JSON)` → persist progressively.

1. **Features** — searches around "what comparable products offer / roadmap gaps" → N scored
   suggestions that fill real gaps.
2. **Spin-offs** — searches around adjacent products/audiences the same assets could support → N
   adjacent product ideas.
3. **Services** — searches around productizable, repeatable offerings derivable from the project →
   N service offerings.

- Each lane wraps scraped content in the **"untrusted data" block** (prompt-injection guard).
- Respects budget / timeouts / caps (same env as existing research).
- The agent receives the allowed category list and returns a fenced JSON block of scored
  suggestions (impact/evidence/fit/effort, category, acceptance[], rationale, real sources).
- **Strict:** if no real sources, surface a clear notice per lane instead of fabricated
  suggestions (**no mock**).
- "Suggestions per run" = **N per lane** (from the form).

## 7. Source abstraction & Settings

Both access modes behind one interface; the Settings page (or env) selects one.

```ts
interface ThrelmarkSource {
  listProjects(): Promise<ProjectSummary[]>
  readProject(id: string): Promise<{ project; items; board; gapMap }>
  writeSuggestion(projectId: string, suggestion): Promise<void>
}
// disk-source.ts → DEFAULT, reads/writes ~/.threlmark directly
// rest-source.ts → GET /api/projects, /api/projects/[id], POST .../suggestions
```

**Precedence:** `ENV override` > `.ideaclyst/settings.json` > `default (disk, ~/.threlmark)`. This
keeps `THRELMARK_DATA_DIR`/`IDEACLYST_ROADMAP_DIR` valid; the Settings page is the convenient path.

The REST source maps to Threlmark's existing API: `GET /api/projects`, `GET /api/projects/[id]`
(+ items/board), and `POST /api/projects/[id]/suggestions` — or, when those write endpoints are not
exposed, the disk writer is used for write-back even in REST read mode (documented in the plan).

## 8. Routes & UI

- `/settings` — choose source (disk/REST), set path or URL, **"Test connection"** (lists found
  projects).
- `/roadmap` — project picker (list from source) + form (N per kind) → creates an analysis,
  `void startAnalysis`, redirect to `[id]`.
- `/roadmap/[id]` — polling (1.5s); shows the `gapMap` + three columns of suggestion cards (score
  badges, why-now, source links). Each card has a checkbox; a top **target-project dropdown**
  (default = analyzed project) + **"Send to Threlmark"** button → `POST …/send {suggestionIds[],
  targetProjectId?}` → `writer` writes flat suggestions (+ `targetProjectId` when different). Sent
  cards are marked **✓ sent** (persisted in the analysis).
- `app-shell.tsx`: new "Roadmap" and "Settings" links.

## 9. Errors, invariants & env

### Invariants (must not regress)
- Threlmark data **read-only except `suggestions/`**.
- All writes **atomic** (temp + rename).
- Source unreachable / project or JSON corrupt → **tolerant notice, no crash**.
- Research **best-effort + strict**; IDs collision-free.

### New env (.env.example)
| Variable | Default | Purpose |
|---|---|---|
| `IDEACLYST_ROADMAP_SOURCE` | (empty → settings/disk) | `disk` \| `rest` |
| `THRELMARK_DATA_DIR` | `~/.threlmark` | data root (disk) |
| `IDEACLYST_ROADMAP_DIR` | (= `THRELMARK_DATA_DIR`) | explicit path override |
| `IDEACLYST_THRELMARK_API` | `http://localhost:<port>` | base URL (REST) |

Research env (mode, engine, timeouts, strict) is unchanged.

## 10. Verification (against real `~/.threlmark/projects/ideaclyst`)

1. `npm run typecheck && npm run lint && npm run build` — clean.
2. `/settings` → disk → "Test connection" lists project `ideaclyst`.
3. `/roadmap` → pick project, live+strict → three lanes return suggestions with **real** sources
   (no "Mock mode").
4. Select + "Send to Threlmark" → `suggestions/<id>.json` appears, flat + provenance.
5. Open Threlmark Inbox → suggestion appears; "accept" makes a real roadmap card
   (`source:"ideaclyst"`); the target-project variant lands in the other project.
6. Broken source (wrong path/URL) → notice, no crash.

## 11. Closing phase — docs & website (after the build)

- Update handbooks **English** (`HANDBOOK.html`) and **German** (`HANDBUCH.html`) for Roadmap
  Intelligence.
- New: **Spanish** (`HANDBOOK.es.html`) and **French** (`HANDBOOK.fr.html`) — full translations.
- Extend the marketing site (`site/`), copy handbooks in, deploy to **ideaclyst.com**.

## 12. Deferred (v2)

- **Promote a suggestion → Council:** run a suggestion through the full IdeaClyst council and write
  its top features back as suggestions.
- Auto-write mode / "Send all" button (③) — can be added later without rework.
