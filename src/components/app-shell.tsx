import Link from "next/link";

/** Top nav + centered content frame shared by every page. */
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-sm font-bold text-white">
              I
            </span>
            <span className="text-base font-semibold tracking-tight text-zinc-900">
              IdeaClyst
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/runs"
              className="rounded-md px-3 py-1.5 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              Sessions
            </Link>
            <Link
              href="/new"
              className="rounded-md bg-zinc-900 px-3 py-1.5 font-medium text-white transition hover:bg-zinc-700"
            >
              Start an Idea Session
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-6 py-4 text-xs text-zinc-400">
          <span>IdeaClyst v0.1.0</span>
          <span>
            Powered by{" "}
            <a
              href="https://thorstenmeyerai.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-zinc-600 underline-offset-2 transition hover:text-zinc-900 hover:underline"
            >
              Thorsten Meyer AI
            </a>
          </span>
          <span>Catalyze rough ideas into buildable SaaS plans.</span>
        </div>
      </footer>
    </div>
  );
}
