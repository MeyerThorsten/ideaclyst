# IdeaClyst — Handbook

**Catalyze rough ideas into buildable SaaS plans.**

🌐 [**ideaclyst.com**](https://ideaclyst.com) &nbsp;·&nbsp; 📦 Open source under the [MIT License](LICENSE)

IdeaClyst is a local-first Next.js app that turns a rough product idea into a
founder planning packet by orchestrating a structured **council** between the
**Claude Code CLI** and the **Codex CLI**.

> 📖 **Prefer the styled handbook?** Open [`HANDBOOK.html`](HANDBOOK.html) (English) or
> [`HANDBUCH.html`](HANDBUCH.html) (Deutsch) — these are richly designed, single-file
> manuals. GitHub shows them as source; download/clone and open in a browser, or serve
> via GitHub Pages, to see them rendered. This README mirrors the English handbook.

---

## ★ Step-by-step guide

The fastest path from a fresh clone to a finished planning packet. Mock mode is the
default, so you need **no CLIs** to try it end to end.

1. **Install dependencies** — from the project root:
   ```bash
   npm install
   ```
2. **Create your config** — copy the example env file. It defaults to **mock mode**:
   ```bash
   cp .env.example .env.local
   ```
3. **Start the dev server** — then open <http://localhost:5417>:
   ```bash
   npm run dev
   ```
4. **Start an idea session** — on the homepage, click **“Start an Idea Session”** to
   open the idea form (`/new`).
5. **Describe your idea** — give it a **title**, write the **idea** (at least a
   sentence, 10+ chars), and pick a **goal** (`validate · plan · build · pitch ·
   refine`). Optionally add a target customer, constraints, or a preferred stack.
   Then submit.
6. **Watch the council deliberate** — you land on the run page, which polls every
   1.5s. The five steps light up as they run (✓ done, ▸ active, ○ pending) and each
   output appears the moment it completes.
7. **Read your packet** — when the run completes, the result tabs fill in: Summary,
   MVP Backlog, Risks, Validation Tests, Next Prompts. Past sessions live under
   `/runs`.
8. **(Optional) Switch to the real CLIs** — set `IDEACLYST_AGENT_MODE=cli` in
   `.env.local`, make sure both CLIs are installed and logged in, then restart the
   server and run a new session. A real council takes **~5–7 min** (five live model
   calls), versus instant in mock mode:
   ```bash
   claude --version && codex login status
   ```
9. **Find the files** — every run is saved under `.ideaclyst/runs/<runId>/` as
   `run.json` plus Markdown artifacts you can read or share outside the app.

> ⚠️ **Heads up in dev:** editing a file mid-run can interrupt an in-flight council
> (the orchestrator runs in-process). If that happens, restart `npm run dev` and start
> a fresh session.

---

## What it is

IdeaClyst turns one rough product idea into a complete founder planning packet — not
with a single prompt, but by orchestrating a **council**: a five-step deliberation
between two AI command-line tools that take opposing roles and critique each other
before reaching a verdict.

Think of it as a tiny boardroom: a **skeptical SaaS founder** (Claude) and a
**pragmatic CTO** (Codex) argue your idea into shape. The output is split into Summary,
MVP Backlog, Risks, Validation Tests, and ready-to-paste Next Prompts.

---

## Features at a glance

- **Dual-agent council** — five alternating steps between Claude and Codex, each
  reading prior outputs and critiquing the other.
- **Mock mode by default** — realistic, idea-aware output with zero CLIs installed.
- **Progressive results** — each step's output appears the instant it completes; the
  run page polls disk every 1.5s.
- **Disk is the truth** — every run persists as `run.json` + Markdown files; a server
  restart never loses a result.
- **Tabbed packet** — the final plan auto-splits into Summary, MVP Backlog, Risks,
  Validation Tests & Next Prompts.
- **No-shell, sandboxed** — CLIs spawn with array args + stdin (no injection); Codex
  runs read-only in a throwaway temp dir.
- **Graceful failure** — a missing or failing CLI marks the run failed with a clear
  message; completed steps survive.
- **No secrets handled** — both CLIs authenticate via their own local sessions.
- **Grouped navigation** — the header keeps the primary start action visible while
  grouping idea scouting under **Explore** (`/discover`, `/trends`) and saved work under
  **Workspace** (`/runs`, `/library`, `/compare`); `/profile` stays directly reachable.
- **Evidence and validation workspaces** — source audit, validation board, analytics,
  interview CRM, and idea clusters are generated from local run/discovery/report data.
- **Roadmap Intelligence** — read a [Threlmark](https://threlmark.com) project's roadmap and
  generate scored, research-grounded feature / spin-off / service suggestions (live + strict),
  then send the keepers back into Threlmark's Inbox. The data source is configured on `/settings`.

---

## The 5-step council

The two agents alternate, and the crucial detail is what each agent **sees** — every
step reads specific prior outputs, which makes it a deliberation rather than five
isolated prompts.

| Step | Agent  | Role | Sees |
|------|--------|------|------|
| 0 | **Research** | Web scouting of the market/competitors (surfagent) | idea brief |
| 1 | **Claude** | Product strategy (skeptical founder) | idea brief + research |
| 2 | **Codex**  | Technical architecture (CTO) | brief + **step 1 strategy** |
| 3 | **Claude** | Critiques the architecture (product lens) | brief + **step 2 architecture** |
| 4 | **Codex**  | Critiques the strategy (engineering lens) | brief + **step 1 strategy** |
| 5 | **Claude** | Final synthesis → founder packet | brief + **all 4 prior outputs** |

The cross-exchange is the point: Codex builds on Claude's strategy (step 2), then each
critiques the *other's* domain (steps 3 & 4), and Claude reconciles all four into a
decisive verdict (step 5). After every step the orchestrator rewrites `run.json` and a
Markdown file, so the UI reveals outputs one at a time.

---

## Web research & Idea Discovery

IdeaClyst vendors [surfagent](https://github.com/AllAboutAI-YT/surfagent)'s read-only
Chrome-DevTools-Protocol modules (`src/lib/research/`) to ground the council in real web
data — and to help you *find* ideas, not just evaluate them.

- **Market research (Step 0)** — before the council, it web-searches the idea, recons the
  top results, and writes a `RESEARCH_FINDINGS.md` that feeds every later step. Surfaced as
  a **Research** tab.
- **Research toolkit** — every research pass now also writes a structured
  `RESEARCH_DOSSIER.json` plus Markdown tools for competitor comparison, opportunity
  mapping, validation experiments, distribution channels, kill criteria, MVP scope, landing
  page critique, competitor watch baselines, and a concise founder brief.
- **Competitor teardown** — paste competitor URLs in the form; their pages are deep-reconned
  into a teardown section and a comparison matrix.
- **Validation evidence** — the final synthesis cites the gathered sources (with links) in
  the Validation Tests section; the toolkit also generates standalone validation
  experiments from the same evidence.
- **Rerun research only** — on a completed run page, use **Rerun research** to queue a
  background refresh of the surfagent-derived artifacts without rerunning the full
  Claude+Codex council. The page polls until the refreshed toolkit lands on disk, writes
  `EVOLUTION_DIFF.md`, and shows the changed research in a **Diff** tab.
- **Run cost and time meter** — runs record elapsed wall-clock time, agent call count,
  approximate input/output tokens, and an estimated cost. Mock mode stays local and records
  zero estimated spend.
- **Idea Discovery** (`/discover`) — don't have an idea yet? Give a market and IdeaClyst
  finds candidate ideas for you, then opens a full report for each one. See its own section
  below.
- **Idea of the day** (`/today`) — a deterministic daily pick from saved local candidate
  reports, with links to the report, funnel, and build workspace.
- **Trend radar** (`/trends`) — turns local discoveries and report keyword maps into a
  market signal library with source confidence, related communities, candidate links, and a
  one-click path to scout any trend as a new discovery.
- **Market insights and monitors** — `/insights` persists market insight reports
  separately from discoveries; `/monitors` reruns local competitor/trend snapshots and writes
  human-readable diffs to `.ideaclyst/monitors/`.
- **Compare, export, hand off** — full candidate reports can be copied as Markdown, JSON,
  a one-page founder brief, or Claude/Codex implementation and review prompts; selected
  reports can also be compared side by side at `/compare`.
- **Founder profile** — `/profile` stores your stage, capacity, skills, market access,
  risk tolerance, sales comfort, capital, and unfair advantages locally; discovery uses it
  to prefill scouting context and reports show a personal-fit lens.
- **My Stuff library** — save candidate ideas and full reports from discovery cards/report
  pages into `/library`; the library persists as JSON and Markdown under `.ideaclyst/`.
- **Keyword intelligence adapter** — candidate reports label keyword source/freshness and
  can consume an optional keyword snapshot JSON while preserving deterministic offline
  estimates when no provider is configured.
- **Evidence browser** (`/evidence`) — audits every source captured by runs,
  discoveries, and candidate reports with confidence, freshness, claims, warnings, and
  backlinks to the artifact that used it.
- **Validation workspace** (`/validation`, `/validation/import`, `/validation/analytics`,
  `/interviews`) — turns report next actions, pricing hypotheses, buyer personas, pasted
  validation results, and CSV-like outreach/waitlist data into a local sprint board,
  analytics view, and interview target list under `.ideaclyst/validation` and
  `.ideaclyst/interviews`.
- **Build workspaces** — candidate reports link to a minimum viable funnel, buyer
  personas, report-grounded advisor answers, a landing-page draft, local share packet,
  report version history, and a build-this-idea project page with a PRD/task queue.
- **Decision log and council memory** — report pages can log promoted/validated/parked/killed
  decisions with evidence; `.ideaclyst/decisions/DECISIONS.md` becomes compact, inspectable
  memory that future council prompts can use.
- **Research settings** (`/settings/research`) — source lanes, query templates, caps, risk
  labels, cache TTL, and cache size are inspectable and stored locally.

Research is **best-effort and mode-gated**, mirroring the agent seam:

- It follows `IDEACLYST_AGENT_MODE` by default (`cli` → live headless Chrome, `mock` →
  deterministic offline output). Override with `IDEACLYST_RESEARCH_MODE`.
- The live path lazily launches one headless Chrome (auto-detected or `IDEACLYST_CHROME_BIN`),
  defaults to the DuckDuckGo HTML endpoint, and enforces per-recon timeouts + an overall
  budget. If Chrome is missing or a search is blocked, it **degrades to offline synthesis with
  a note — a run never fails because of research.** Requires a Chrome/Chromium install for the
  live path; mock needs nothing. See `.env.example` for all `IDEACLYST_RESEARCH_*` knobs.

## Idea Discovery — find ideas, don't just evaluate them

The hardest part of building isn't judging an idea — it's **finding one worth judging**.
Idea Discovery flips IdeaClyst around: instead of evaluating an idea you bring, it scouts
the real web for problems people are actually complaining about and proposes buildable
candidates, grounded in live demand signals instead of a blank page.

**The flow** (`/discover`):

1. **Profile yourself** *(optional)* — fill out `/profile` once so discovery can account
   for your skills, buyer access, risk tolerance, budget, and available time.
2. **Brief it** — a market or space (e.g. *"visionOS apps"*, *"AI for accountants"*) **plus
   your goal** (commercial · portfolio · learning · personal) and **build capacity** (solo ·
   team · AI-assisted), and any constraints. If a founder profile exists, its context is
   prefilled into the notes and can be edited per discovery.
3. **Scout** — headless Chrome (surfagent) sweeps configurable source-specific search lanes — **Hacker
   News, Reddit, Product Hunt, GitHub, commercial review/pricing pages, and general web** —
   for problems, *"I wish there was…"* posts, recent launches, and implementation ecosystems.
   Each source is best-effort and skipped-with-note if it's walled or blocked.
4. **Market read** — Claude writes an **honest, sourced read** of the space first: a one-line
   verdict, demand signals, competition, who actually pays, and a realistic outlook for *your*
   goal — not blind optimism.
5. **Opportunity map** — the scout also builds a high-pain/competition map so the page shows
   which zones are sharp wedges, validated-but-crowded bets, exploratory ideas, or likely
   skips.
6. **Ranked concepts** — then **5–7 candidate ideas, ranked best-fit-first**, each carrying a
   wedge, **who pays**, **build effort** (low/moderate/high for your capacity), **commercial
   strength** (strong/medium/weak for your goal), the **biggest risk**, **why it fits**, and the
   **signal + source** that surfaced it. Each card includes a transparent confidence score
   across demand evidence, build fit, monetization clarity, novelty, and competition. When a
   founder profile exists, a for-you rank explains the personal fit and penalties.
7. **Full idea report** — before promoting, every candidate gets an IdeaBrowser-style local
   report at `/discover/[id]/ideas/[candidateId]`: scorecard, business fit, offer/value ladder,
   why-now factors, proof signals, market gaps, execution plan, framework fit, community and
   keyword intelligence, founder fit, a profile lens, and a roast.
8. **Save, compare, and export** — save candidates/reports into `/library`, add reports to
   `/compare` to sort ideas side by side by opportunity, founder fit, feasibility, or timing,
   copy the full Markdown report, structured JSON, a concise one-pager, an implementation
   prompt, or a review-only prompt, regenerate reports without rebuilding the discovery, and
   export a self-contained local HTML packet.
9. **Watch trends** — `/trends` rolls discoveries, report keywords, source lanes, and related
   communities into a local market-signal library. Each trend links back to candidate reports
   and can prefill `/discover` so you can scout the signal further.
10. **Promote to council** — one click turns a candidate into a normal run, carrying the report
   thesis, founder-fit note, core offer, and roast verdict into the council brief. The run then
   executes its own market-research Step 0 and the full 5-step council.

Each stage is **persisted progressively** (scout → market read → concepts), so the page reveals
them live like a council run.

**How it's built**

- New flow alongside runs: `src/lib/discovery/` (store + orchestrator), routes under
  `/api/discoveries` (list/create, get, and `…/[id]/promote`), and pages at `/discover` and
  `/discover/[id]`, with per-candidate reports under
  `/discover/[id]/ideas/[candidateId]` and a local comparison surface at `/compare`.
  The candidate scout/synthesis lives in `src/lib/research/` (`scoutMarket`, `marketReadFor`,
  and `candidatesFor`).
- Local memory lives next to runs/discoveries: `/profile` writes
  `.ideaclyst/profile/profile.json` + `PROFILE.md`; `/library` writes
  `.ideaclyst/library/library.json` + `LIBRARY.md`; `/trends` writes
  `.ideaclyst/trends/trends.json` + `TRENDS.md`; validation and interview surfaces write
  `.ideaclyst/validation/*` and `.ideaclyst/interviews/*`; decisions, insights, monitors,
  exports, and source-lane settings write to `.ideaclyst/decisions`, `.ideaclyst/insights`,
  `.ideaclyst/monitors`, `.ideaclyst/exports`, and `.ideaclyst/research`.
- The top navigation stays lean: **Explore** (`/discover`, `/today`, `/trends`) and
  **Workspace** (`/runs`, `/library`, `/validation`) are the only grouped menus. Deeper tools
  such as Evidence, Compare, Decisions, Insights, Monitors, Interviews, Clusters, and Research
  Settings are linked contextually from those pages.
- Candidate keyword analysis lives behind `src/lib/research/keywords.ts`. It uses deterministic
  offline estimates by default, can merge optional snapshot data from env, and reports the source
  and freshness directly in the candidate report.
- Live search now fans out through native Hacker News and Reddit JSON adapters plus the
  configured web engine(s), dedupes results, and stores real search, recon, and readable page
  extracts in a TTL-bound, size-capped on-disk cache under `.ideaclyst/research-cache`.
- **Mode-gated and best-effort**, exactly like research: deterministic offline candidates in
  `mock`, live scouting + Claude synthesis in `cli`. It always returns candidates — even
  offline or when a source is blocked.
- Each discovery persists to disk under `.ideaclyst/discoveries/<id>/` (`discovery.json` +
  `MARKET_READ.md`, `OPPORTUNITY_MAP.md`, `CANDIDATES.md`, and `CANDIDATE_REPORTS.md`); the
  discovery page polls just like a run.

## Roadmap Intelligence — read a Threlmark roadmap, suggest what's next

Where Discovery finds *new* ideas, **Roadmap Intelligence** (the `/roadmap` route) extends an
*existing* product. It reads the roadmap of a [Threlmark](https://threlmark.com) project — a
separate local-first roadmap manager — and proposes scored, research-grounded ways to grow it.

- **Point at a project.** Threlmark projects are read from its data dir (`~/.threlmark` by
  default) **read-only**, or via Threlmark's REST API. The data source (disk vs. REST, path,
  base URL) is configured on the new `/settings` page; environment variables take precedence.
- **Gap map first.** A deterministic coverage read — strong vs. thin/absent categories, done
  vs. open, top open items by priority — frames the analysis before any model runs.
- **Three research lanes.** *Features* (fill gaps), *spin-off products* (adjacency), and
  *services* (productize) each run their own live web research and return suggestions scored on
  the same `impact`/`evidence`/`fit`/`effort` axes as a roadmap item, each with a why-now and
  **real source links**. **Live + strict only** — if no real sources are found, the lane shows
  a clear notice instead of fabricating. You choose how many suggestions per lane.
- **Review, then send.** Tick the keepers and **Send to Threlmark**: IdeaClyst writes flat
  suggestion files into the project's `suggestions/` folder (the *only* place it ever writes to
  Threlmark), which Threlmark's Inbox accepts into the roadmap (`source: "ideaclyst"`). A
  target-project dropdown lets you cross-promote a suggestion into a *different* project.
- Each analysis persists under `.ideaclyst/roadmap/<id>/` and the review page polls live, just
  like a run. Suggestions carry provenance (kind, why-now, sources) that round-trips intact.

Interop follows a small shared data contract, so two independent, local-first apps cooperate
with no server required and no data ever leaving your disk.

## Request lifecycle

The server responds **before** the council finishes:

1. **Submit** — the `/new` form `POST`s the idea brief to `/api/runs`.
2. **Validate & create** — a `queued` run is written to disk (`run.json` + `IDEA.md`).
3. **Fire & forget** — the server calls `void startRun(id)` *without awaiting* and
   returns `{ runId }` (201) immediately.
4. **Redirect** — the client navigates to `/runs/[runId]`.
5. **Poll** — the run page fetches `GET /api/runs/[runId]` every **1.5s**.
6. **Deliberate** — in the background, the orchestrator runs steps 1→5, rewriting
   `run.json` after each.
7. **Complete** — step 5 is split into tabs, status becomes `completed`/`failed`, and
   polling stops.

---

## Mock vs. CLI mode

One env var, `IDEACLYST_AGENT_MODE`, selects the backend. The orchestrator and UI are
identical in both modes — only `src/lib/agents/` behaves differently.

| Aspect | Mock (default) | CLI |
|--------|----------------|-----|
| Set with | `IDEACLYST_AGENT_MODE=mock` | `IDEACLYST_AGENT_MODE=cli` |
| Needs CLIs? | No — runs instantly offline | Yes — `claude` & `codex` installed + logged in |
| Driven by | structured run + step key | the generated prompt |
| Output | deterministic, idea-aware Markdown | real model output |

CLI mode requires the binaries installed and authenticated locally:

```bash
claude --version          # Claude Code CLI on PATH
codex login status        # Codex CLI logged in (ChatGPT session)
```

> ⏱️ **Expect minutes, not seconds.** A full council in CLI mode is five real model
> calls — roughly 50–80s per step, ~5–7 min end to end. Mock mode finishes instantly.
> Env vars are read at server start, so **restart `npm run dev`** after changing the
> mode, and note that switching modes **does not recompute existing runs** — start a
> fresh session.

**Did a run actually use the real CLIs?** Open its `PRODUCT_STRATEGY.md` — real output
is specific to your idea and references your `preferredStack`/constraints, whereas mock
output reuses a fixed template (it splices your idea text into generic phrasing like
"…points at a workflow that is currently manual, fragmented, or simply tolerated").

---

## How CLI calls work

In CLI mode each council step spawns a real process. Both backends use **array args +
stdin** (never a shell string), so a prompt can't break escaping or inject shell syntax,
and both enforce a per-call timeout (default 180s).

**Claude backend — no `-p` / `--print`.** When `claude`'s stdout is not a TTY (here it's
a pipe), the CLI runs non-interactively and prints a single response, then exits. So
IdeaClyst just pipes the prompt on stdin and reads stdout — no print flag needed.
`--tools ""` keeps it a pure text completion (no agentic file actions), and it runs
inside the **idea's own run directory** (spawn `cwd`):

```bash
claude --tools "" [--model <model>]   # prompt on stdin, stdout piped (non-TTY)
```

> Why no `-p`? The CLI's clean non-interactive behavior is triggered by a non-TTY
> stdout, not solely by the print flag — so dropping `-p` (and the `-p`-only
> `--output-format`) still yields a one-shot completion. Each idea runs in its own
> directory, mirroring how Codex is isolated.

**Codex backend.** Runs Codex non-interactively, **read-only**, inside a throwaway temp
working directory so it can't touch your filesystem:

```bash
codex exec --json --skip-git-repo-check --ephemeral \
  -s read-only --color never -C <temp-dir> -o last-message.txt -
```

The clean final message is read from the `-o` output file; the `--json` event stream is
parsed as a fallback. The temp dir is always removed afterward.

If a CLI is missing or fails, the run is marked failed with a clear message pointing you
back to mock mode.

---

## Data model & storage

IdeaClyst is local-first: **no database, no in-memory state**. Each run is a directory,
and `run.json` is the single source of truth.

```
.ideaclyst/                          # IDEACLYST_DATA_DIR (default)
├─ runs/
│  └─ <runId>/                       # timestamp-prefixed slug
│     ├─ run.json                    # ← single source of truth
│     ├─ IDEA.md                     # the brief, human-readable
│     ├─ RESEARCH_FINDINGS.md        # step 0 memo
│     ├─ RESEARCH_DOSSIER.json       # structured source evidence
│     ├─ RESEARCH_TOOLKIT.md         # all research tools in one Markdown packet
│     ├─ COMPETITOR_MATRIX.md        # competitor comparison matrix
│     ├─ OPPORTUNITY_MAP.md          # high-pain / competition map
│     ├─ VALIDATION_EXPERIMENTS.md   # source-grounded experiments
│     ├─ DISTRIBUTION_PLAN.md        # where to reach early users
│     ├─ IDEA_GRAVEYARD.md           # kill criteria
│     ├─ MVP_SCOPE_NEGOTIATION.md    # must-have / defer / scope creep
│     ├─ LANDING_PAGE_CRITIC.md      # competitor landing-page critique
│     ├─ COMPETITOR_WATCH.md         # local watch baseline
│     ├─ FOUNDER_BRIEF.md            # concise founder-ready brief
│     ├─ PRODUCT_STRATEGY.md         # step 1
│     ├─ TECHNICAL_ARCHITECTURE.md   # step 2
│     ├─ CRITIQUES.md                # steps 3 + 4 combined
│     ├─ FINAL_PLAN.md               # step 5
│     └─ TRANSCRIPT.md               # running log of every exchange
└─ discoveries/
   └─ <discoveryId>/
      ├─ discovery.json              # market read, candidates, reports, source metadata
      ├─ MARKET_READ.md              # honest market landscape
      ├─ OPPORTUNITY_MAP.md          # wedge zones
      ├─ CANDIDATES.md               # ranked candidate ideas
      └─ CANDIDATE_REPORTS.md        # full per-candidate reports
```

A run carries the brief, a `status` of `queued → running → completed | failed`, a
`currentStep` label for the UI, and an `outputs` object that starts empty and fills in.
Run IDs are timestamp-prefixed, so a reverse string-sort yields newest-first.

The final plan is split into tabs by `markdown.ts`, which matches `##` headings
case-insensitively by keyword and falls back to showing the full plan in Summary if a
section can't be found — so a tab is never blank.

---

## API reference

- **`GET /api/runs`** — list all runs, newest first → `{ runs: Run[] }`.
- **`POST /api/runs`** — validate the brief, create a queued run, fire the council in
  the background, return `{ runId }` (201). Validation: title required; idea ≥ 10 chars;
  goal ∈ `validate · plan · build · pitch · refine`.
- **`GET /api/runs/[runId]`** — return a single run as `{ run: Run }` (what the detail
  page polls every 1.5s).
- **`POST /api/runs/[runId]/research`** — queue only the research/toolkit pass for an
  existing run and return the queued `{ run }` (202). The detail page polls
  `/api/runs/[runId]` until the refreshed artifacts are written. It does not rerun the
  full council.

### Drive a run from the terminal

The UI is just a client of this API — anything you can do in the browser you can do from
a script. Create a run, then poll until it completes:

```bash
# 1. Create a run → returns { "runId": "..." }
curl -s -X POST http://localhost:5417/api/runs \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "StandupScribe",
    "idea": "A Slack bot that collects async standup updates and posts a daily digest.",
    "goal": "plan",
    "preferredStack": "TypeScript, Next.js, Vercel"
  }'

# 2. Poll status until completed (every few seconds)
curl -s http://localhost:5417/api/runs/<runId> | jq '.run.status, .run.currentStep'

# 3. Read the finished packet from disk
cat .ideaclyst/runs/<runId>/FINAL_PLAN.md
```

---

## Project layout

```
src/
  app/
    page.tsx                  # homepage
    new/page.tsx              # idea form
    runs/page.tsx             # sessions list
    runs/[runId]/page.tsx     # live run detail (polls)
    discover/[id]/ideas/[candidateId]/page.tsx # full candidate report
    api/runs/route.ts         # GET list / POST create (+ fire council)
    api/runs/[runId]/route.ts # GET one
    api/runs/[runId]/research/route.ts # POST rerun research only
    roadmap/page.tsx          # roadmap-intelligence: project picker + analysis review (polls)
    settings/page.tsx         # Threlmark data-source config (disk/REST) + test connection
    api/roadmap/route.ts      # GET Threlmark projects / POST create analysis (+ [id], [id]/send)
    api/settings/route.ts     # GET/PUT settings, POST test-connection
  components/                 # app-shell, idea-form, result-tabs, candidate-report, …
  lib/
    agents/                   # runAgent dispatch + mock / claude / codex / prompts
    research/                 # vendored surfagent CDP modules + research/report seam
    evidence/                 # source browser and freshness/confidence scoring
    validation/               # validation board and analytics generated from reports
    interviews/               # interview target list generated from buyer personas
    clusters/                 # explainable local idea clustering
    report-tools/             # PRD/funnel/persona/advisor/project generators
    trends/                   # local trend radar built from discovery/report artifacts
    discovery/                # idea-discovery store + orchestrator
    threlmark/                # read-only Threlmark reader + suggestion writer + disk/REST source
    roadmap/                  # roadmap-intelligence analysis store + 3-lane orchestrator
    settings/                 # app settings (.ideaclyst/settings.json) with env precedence
    runs/                     # types, on-disk store, final-plan section splitter
    orchestrator.ts           # the council pipeline (research Step 0 + 5 council steps)
    utils.ts                  # slug + lightweight markdown renderer
```

---

## Configuration (`.env.local`)

| Var | Default | Purpose |
|-----|---------|---------|
| `IDEACLYST_AGENT_MODE` | `mock` | `mock` or `cli` |
| `IDEACLYST_CLAUDE_BIN` | `claude` | Claude CLI binary/path |
| `IDEACLYST_CLAUDE_MODEL` | _(empty)_ | Concrete Claude model (e.g. `opus`, `sonnet`), or defer to the CLI default |
| `IDEACLYST_CODEX_BIN` | `codex` | Codex CLI binary/path |
| `IDEACLYST_CODEX_MODEL` | _(empty)_ | Concrete Codex model, or defer to `~/.codex/config.toml` |
| `IDEACLYST_AGENT_TIMEOUT_MS` | `180000` | Per-agent-call timeout |
| `IDEACLYST_DATA_DIR` | `.ideaclyst` | Where runs are stored |

**Research & discovery** (all best-effort; the live path needs a Chrome/Chromium install):

| Var | Default | Purpose |
|-----|---------|---------|
| `IDEACLYST_RESEARCH_MODE` | _(follows agent mode)_ | `mock` or `live` override |
| `IDEACLYST_RESEARCH_STRICT` | _(off)_ | `1` = never show mock/offline content; show a clear notice if live data is unavailable (pair with `live`) |
| `IDEACLYST_RESEARCH_ENGINE` | `duckduckgo` | `duckduckgo` (default) · `bing` · `google` |
| `IDEACLYST_CHROME_BIN` | _(auto-detected)_ | Chrome/Chromium path override |
| `IDEACLYST_RESEARCH_USER_AGENT` | _(desktop Chrome UA)_ | UA override (avoids headless bot challenges) |
| `IDEACLYST_RESEARCH_CDP_PORT` | `9222` | Headless Chrome debug port |
| `IDEACLYST_RESEARCH_TIMEOUT_MS` | `20000` | Per-page recon timeout |
| `IDEACLYST_RESEARCH_BUDGET_MS` | `60000` | Whole research/scout step budget |
| `IDEACLYST_RESEARCH_MAX_RESULTS` | `6` | Search results parsed per query |
| `IDEACLYST_RESEARCH_MAX_SOURCES` | `3` | Pages deep-reconned |
| `IDEACLYST_RESEARCH_IDLE_MS` | `120000` | Reap idle headless Chrome after |
| `IDEACLYST_KEYWORD_SNAPSHOT_JSON` | _(empty)_ | Optional JSON array of keyword snapshot entries for report keyword intelligence |
| `IDEACLYST_KEYWORD_SNAPSHOT_FRESHNESS` | _(empty)_ | Label shown beside snapshot-backed keyword estimates |

Web research (Step 0) can also be **toggled off per run** in the idea form — handy when you
just want the council without scouting.

**Roadmap Intelligence (Threlmark interop)** — where IdeaClyst reads Threlmark projects from;
the `/settings` page edits these too, and environment variables take precedence:

| Var | Default | Purpose |
|-----|---------|---------|
| `IDEACLYST_ROADMAP_SOURCE` | _(settings / `disk`)_ | `disk` or `rest` data-access mode |
| `THRELMARK_DATA_DIR` | `~/.threlmark` | Threlmark data root (disk source) |
| `IDEACLYST_ROADMAP_DIR` | _(= `THRELMARK_DATA_DIR`)_ | Explicit path override for where to read projects |
| `IDEACLYST_THRELMARK_API` | _(none)_ | Base URL for the REST source (e.g. `http://localhost:4789`) |

---

## Scripts

```bash
npm run dev        # dev server on :5417 (Turbopack)
npm run build      # production build
npm run start      # serve the production build on :5417
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

---

## Notes & limitations (v0)

- **Local dev hot reload** can interrupt an in-flight background council run (the
  orchestrator runs in-process). If you edit a file mid-run, restart `dev` and start a
  fresh session.
- No auth, billing, teams, database, or Docker. Runs are local files.

---

## License

IdeaClyst is open source under the [MIT License](LICENSE). © 2026 Thorsten Meyer.

Website: [ideaclyst.com](https://ideaclyst.com) · Powered by [Thorsten Meyer AI](https://thorstenmeyerai.com/).
