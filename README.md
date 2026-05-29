# IdeaClyst — Handbook

**Catalyze rough ideas into buildable SaaS plans.**

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

---

## The 5-step council

The two agents alternate, and the crucial detail is what each agent **sees** — every
step reads specific prior outputs, which makes it a deliberation rather than five
isolated prompts.

| Step | Agent  | Role | Sees |
|------|--------|------|------|
| 1 | **Claude** | Product strategy (skeptical founder) | idea brief |
| 2 | **Codex**  | Technical architecture (CTO) | brief + **step 1 strategy** |
| 3 | **Claude** | Critiques the architecture (product lens) | brief + **step 2 architecture** |
| 4 | **Codex**  | Critiques the strategy (engineering lens) | brief + **step 1 strategy** |
| 5 | **Claude** | Final synthesis → founder packet | brief + **all 4 prior outputs** |

The cross-exchange is the point: Codex builds on Claude's strategy (step 2), then each
critiques the *other's* domain (steps 3 & 4), and Claude reconciles all four into a
decisive verdict (step 5). After every step the orchestrator rewrites `run.json` and a
Markdown file, so the UI reveals outputs one at a time.

---

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
└─ runs/
   └─ <runId>/                       # timestamp-prefixed slug
      ├─ run.json                    # ← single source of truth
      ├─ IDEA.md                     # the brief, human-readable
      ├─ PRODUCT_STRATEGY.md         # step 1
      ├─ TECHNICAL_ARCHITECTURE.md   # step 2
      ├─ CRITIQUES.md                # steps 3 + 4 combined
      ├─ FINAL_PLAN.md               # step 5
      └─ TRANSCRIPT.md               # running log of every exchange
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
    api/runs/route.ts         # GET list / POST create (+ fire council)
    api/runs/[runId]/route.ts # GET one
  components/                 # app-shell, idea-form, result-tabs, run-card, …
  lib/
    agents/                   # runAgent dispatch + mock / claude / codex / prompts
    runs/                     # types, on-disk store, final-plan section splitter
    orchestrator.ts           # the 5-step council pipeline
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
