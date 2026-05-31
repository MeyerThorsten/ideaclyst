import FounderProfileForm from "@/components/founder-profile-form";
import { getFounderProfile } from "@/lib/profile/store";
import { profileFitNotes } from "@/lib/profile/summary";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await getFounderProfile();
  const notes = profileFitNotes(profile);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Founder profile</div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">Tune IdeaClyst to you</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
            Save your capacity, skills, market access, and constraints once. Discovery uses this context to prefill scouting notes, and reports show a profile lens before you promote.
          </p>
        </div>
        {profile ? (
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-500">
            Updated {new Date(profile.updatedAt).toLocaleString()}
          </div>
        ) : null}
      </div>

      {notes.length ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-zinc-900">Current profile lens</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {notes.map((note) => (
              <div key={note} className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 ring-1 ring-inset ring-zinc-200">
                {note}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <FounderProfileForm profile={profile} />
      </section>
    </div>
  );
}
