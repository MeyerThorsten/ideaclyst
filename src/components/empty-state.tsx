import Link from "next/link";

export default function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-lg font-bold text-white">
        I
      </div>
      <h2 className="text-lg font-semibold text-zinc-900">No idea sessions yet</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">
        Start your first session and let the Claude + Codex council turn a rough idea
        into a buildable plan.
      </p>
      <Link
        href="/new"
        className="mt-6 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
      >
        Start an Idea Session
      </Link>
    </div>
  );
}
