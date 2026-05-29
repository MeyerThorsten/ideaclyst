# IdeaClyst

**Catalyze rough ideas into buildable SaaS plans.**

IdeaClyst is a local-first Next.js app that turns a rough product idea into a
founder planning packet by orchestrating a structured **council** between the
**Claude Code CLI** and the **Codex CLI**.

## How it works

You submit an idea. A 5-step council deliberates, and each step's output appears
live as it completes:

1. **Claude — product strategist** (a skeptical SaaS founder) shapes the strategy.
2. **Codex — pragmatic CTO** designs a lean technical architecture.
3. **Claude** critiques the architecture from a product/shipping lens.
4. **Codex** critiques the strategy from an engineering-reality lens.
5. **Claude** synthesizes everything into a final founder packet, split into
   Summary, MVP Backlog, Risks, Validation Tests, and Next Prompts.

Every run is stored on disk under `.ideaclyst/runs/<runId>/` as `run.json` plus
Markdown artifacts (`IDEA.md`, `PRODUCT_STRATEGY.md`, `TECHNICAL_ARCHITECTURE.md`,
`CRITIQUES.md`, `FINAL_PLAN.md`, `TRANSCRIPT.md`). `run.json` is the single source
of truth — the run page polls it for live progress.

## Quick start

```bash
npm install
cp .env.example .env.local   # defaults to mock mode — no CLIs needed
npm run dev                  # http://localhost:5417
```

Open the app, click **Start an Idea Session**, submit an idea, and watch the
packet assemble.

## Modes

IdeaClyst runs in **mock mode** by default — realistic, idea-aware output with no
real CLI calls, so it's demoable immediately. Flip one env var to use the real
CLIs:

```bash
# .env.local
IDEACLYST_AGENT_MODE=cli
```

CLI mode requires the binaries installed and authenticated locally:

```bash
claude --version          # Claude Code CLI on PATH
codex login status        # Codex CLI logged in (ChatGPT session)
```

The agent layer (`src/lib/agents/`) is the only mode-aware code. It runs the
`claude` CLI (no `-p` — piped, non-TTY stdout makes it non-interactive; `--tools ""`
keeps it a pure completion) inside each idea's own run directory, and `codex exec`
in an ephemeral temp dir. Both use array args (no shell) and a per-call timeout.
If a CLI is missing or fails, the run is marked failed with a clear message
pointing you back to mock mode.

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

## Scripts

```bash
npm run dev        # dev server on :5417 (Turbopack)
npm run build      # production build
npm run start      # serve the production build on :5417
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

## Notes & limitations (v0)

- **Local dev hot reload** can interrupt an in-flight background council run
  (the orchestrator runs in-process). If you edit a file mid-run, restart `dev`
  and start a fresh session.
- No auth, billing, teams, database, or Docker. Runs are local files.

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
