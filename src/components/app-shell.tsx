import Link from "next/link";

const NAV_GROUPS = [
  {
    label: "Explore",
    links: [
      { href: "/discover", label: "Discover" },
      { href: "/today", label: "Today" },
      { href: "/trends", label: "Trends" },
    ],
  },
  {
    label: "Workspace",
    links: [
      { href: "/runs", label: "Sessions" },
      { href: "/library", label: "Library" },
      { href: "/validation", label: "Validation" },
      { href: "/roadmap", label: "Roadmap" },
    ],
  },
];

function NavMenu({
  label,
  links,
}: {
  label: string;
  links: { href: string; label: string }[];
}) {
  return (
    <details className="group relative">
      <summary className="flex list-none items-center gap-1 rounded-md px-3 py-1.5 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 [&::-webkit-details-marker]:hidden">
        <span>{label}</span>
        <span aria-hidden="true" className="text-[10px] font-semibold text-zinc-400">
          v
        </span>
      </summary>
      <div className="absolute right-0 z-20 mt-2 min-w-44 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block rounded-md px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </details>
  );
}

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
          <nav className="flex flex-wrap items-center justify-end gap-2 text-sm">
            {NAV_GROUPS.map((group) => (
              <NavMenu key={group.label} label={group.label} links={group.links} />
            ))}
            <Link
              href="/profile"
              className="rounded-md px-3 py-1.5 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              Profile
            </Link>
            <Link
              href="/settings"
              className="rounded-md px-3 py-1.5 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              Settings
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
