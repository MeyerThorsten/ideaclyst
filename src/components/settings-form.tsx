"use client";

import { useEffect, useState } from "react";

interface StoredSettings {
  roadmapSource: "disk" | "rest";
  dataDir?: string;
  baseUrl?: string;
}

export function SettingsForm() {
  const [source, setSource] = useState<"disk" | "rest">("disk");
  const [dataDir, setDataDir] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [test, setTest] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d: { stored: StoredSettings }) => {
        setSource(d.stored.roadmapSource);
        setDataDir(d.stored.dataDir ?? "");
        setBaseUrl(d.stored.baseUrl ?? "");
      })
      .catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ roadmapSource: source, dataDir, baseUrl }),
    }).catch(() => {});
    setSaving(false);
  }

  async function testConnection() {
    setTest("Testing…");
    try {
      const r = await fetch("/api/settings", { method: "POST" });
      const d = (await r.json()) as { ok: boolean; count: number; names: string[] };
      setTest(d.ok ? `Found ${d.count} project(s): ${d.names.join(", ")}` : "No projects found at this source.");
    } catch {
      setTest("Connection failed.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium">Roadmap source</label>
        <div className="flex gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" checked={source === "disk"} onChange={() => setSource("disk")} /> Disk (default)
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={source === "rest"} onChange={() => setSource("rest")} /> REST API
          </label>
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium">Data dir (disk)</label>
        <input
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          placeholder="~/.threlmark (leave blank for default)"
          value={dataDir}
          onChange={(e) => setDataDir(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium">Base URL (REST)</label>
        <input
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
          placeholder="http://localhost:5418"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="rounded bg-neutral-900 px-4 py-2 text-sm text-white">
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={testConnection} className="rounded border border-neutral-300 px-4 py-2 text-sm">
          Test connection
        </button>
      </div>
      {test && <p className="text-sm text-neutral-600">{test}</p>}
      <p className="text-xs text-neutral-500">
        Environment variables override these (IDEACLYST_ROADMAP_SOURCE, IDEACLYST_ROADMAP_DIR / THRELMARK_DATA_DIR, IDEACLYST_THRELMARK_API).
      </p>
    </div>
  );
}
