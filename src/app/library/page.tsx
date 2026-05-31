import Link from "next/link";

import RemoveLibraryButton from "@/components/remove-library-button";
import { getLibrary } from "@/lib/library/store";
import { LibraryItem, LibraryItemType } from "@/lib/library/types";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<LibraryItemType, string> = {
  candidate: "Saved ideas",
  report: "Saved reports",
  run: "Saved sessions",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function groupItems(items: LibraryItem[]): Record<LibraryItemType, LibraryItem[]> {
  return {
    candidate: items.filter((item) => item.type === "candidate"),
    report: items.filter((item) => item.type === "report"),
    run: items.filter((item) => item.type === "run"),
  };
}

export default async function LibraryPage() {
  const library = await getLibrary();
  const groups = groupItems(library.items);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">My Stuff</div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">Saved ideas and reports</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
            A local library for the candidates and reports you want to revisit. Items are written to `.ideaclyst/library/` and stay on this machine.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/compare" className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">
            Compare
          </Link>
          <Link href="/evidence" className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">
            Evidence
          </Link>
          <Link href="/decisions" className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">
            Decisions
          </Link>
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
            {library.items.length} saved item{library.items.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {!library.items.length ? (
        <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-zinc-900">Nothing saved yet</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-zinc-600">
            Save candidates from discovery cards or full report pages, then come back here when you want to compare, promote, or continue.
          </p>
          <Link href="/discover" className="mt-4 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700">
            Discover ideas
          </Link>
        </section>
      ) : (
        (Object.keys(groups) as LibraryItemType[]).map((type) => (
          <section key={type} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              {TYPE_LABELS[type]} <span className="text-zinc-400">({groups[type].length})</span>
            </h2>
            {groups[type].length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {groups[type].map((item) => (
                  <article key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium capitalize text-zinc-600">
                            {item.type}
                          </span>
                          {item.score !== undefined ? (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
                              {item.score}/100
                            </span>
                          ) : null}
                        </div>
                        <h3 className="mt-2 text-base font-semibold text-zinc-900">{item.title}</h3>
                      </div>
                      <RemoveLibraryButton itemId={item.id} />
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-600">{item.description}</p>
                    {item.tags.length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-zinc-50 px-2 py-0.5 text-xs text-zinc-500 ring-1 ring-inset ring-zinc-200">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
                      <span>Saved {formatDate(item.savedAt)}</span>
                      <Link href={item.href} className="font-medium text-indigo-600 underline-offset-2 hover:underline">
                        Open
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-5 text-sm text-zinc-400">
                No {TYPE_LABELS[type].toLowerCase()} yet.
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}
