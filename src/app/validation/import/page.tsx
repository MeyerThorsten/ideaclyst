import ValidationImporter from "@/components/validation-importer";
import { listValidationResults } from "@/lib/validation/results";

export const dynamic = "force-dynamic";

export default async function ValidationImportPage() {
  const results = await listValidationResults();
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Validation</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">Validation result importer</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
          Paste CSV or raw notes from waitlists, interviews, landing-page tests, and outreach. The raw input is retained locally with a simple audit score.
        </p>
      </div>
      <ValidationImporter />
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-zinc-900">Imported results</h2>
        <div className="mt-4 space-y-2">
          {results.map((result) => (
            <div key={result.id} className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600 ring-1 ring-inset ring-zinc-200">
              <span className="font-semibold text-zinc-900">{result.score}/100</span> · {result.rows} rows · {result.positiveSignals} positive · {result.negativeSignals} negative
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
