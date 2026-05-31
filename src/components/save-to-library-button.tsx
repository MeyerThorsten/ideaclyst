"use client";

import { useEffect, useState } from "react";

import { LibraryItemInput } from "@/lib/library/types";

type ButtonTone = "solid" | "subtle";

function buttonClass(tone: ButtonTone): string {
  if (tone === "solid") {
    return "rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60";
  }
  return "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60";
}

export default function SaveToLibraryButton({
  item,
  tone = "subtle",
}: {
  item: LibraryItemInput;
  tone?: ButtonTone;
}) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/library?itemId=${encodeURIComponent(item.id)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSaved(Boolean(data.saved));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [item.id]);

  async function toggle() {
    setBusy(true);
    setMessage(null);
    try {
      if (saved) {
        const res = await fetch(`/api/library?itemId=${encodeURIComponent(item.id)}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Could not remove from library");
        setSaved(false);
        setMessage("Removed");
      } else {
        const res = await fetch("/api/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Could not save to library");
        }
        setSaved(true);
        setMessage("Saved");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Library update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={toggle} disabled={busy} className={buttonClass(tone)}>
        {busy ? "Saving..." : saved ? "Saved" : "Save"}
      </button>
      {message ? <span className="text-xs text-zinc-500">{message}</span> : null}
    </span>
  );
}
