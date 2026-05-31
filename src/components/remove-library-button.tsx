"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RemoveLibraryButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch(`/api/library?itemId=${encodeURIComponent(itemId)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Remove failed");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? "Removing..." : "Remove"}
    </button>
  );
}
