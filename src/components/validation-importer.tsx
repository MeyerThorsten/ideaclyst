"use client";

import { useState } from "react";

export default function ValidationImporter() {
  const [raw, setRaw] = useState("");
  const [source, setSource] = useState<"csv" | "text">("text");
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    setNotice(null);
    const res = await fetch("/api/validation/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw, source }),
    });
    const data = await res.json();
    if (res.ok) {
      setNotice(`Imported ${data.result.rows} rows; validation score ${data.result.score}/100`);
      setRaw("");
    } else {
      setNotice(data.error || "Import failed");
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">Import validation results</h2>
        <select value={source} onChange={(event) => setSource(event.target.value as "csv" | "text")} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
          <option value="text">Pasted notes</option>
          <option value="csv">CSV</option>
        </select>
      </div>
      <textarea
        className="mt-4 min-h-56 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
        value={raw}
        onChange={(event) => setRaw(event.target.value)}
        placeholder="Paste waitlist rows, interview notes, outreach replies, or CSV export."
      />
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={submit} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
          Import results
        </button>
        {notice ? <span className="text-sm text-zinc-500">{notice}</span> : null}
      </div>
    </div>
  );
}
