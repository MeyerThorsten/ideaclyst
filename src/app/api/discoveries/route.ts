/**
 * Discoveries collection endpoint.
 *   GET  → list all discoveries (newest first)
 *   POST → validate a domain, create a queued discovery, fire scouting in the
 *          background (NOT awaited), return { id }.
 */

import { NextResponse } from "next/server";

import { createDiscovery, listDiscoveries } from "@/lib/discovery/store";
import { startDiscovery } from "@/lib/discovery/orchestrator";

export async function GET() {
  const discoveries = await listDiscoveries();
  return NextResponse.json({ discoveries });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const domain = typeof b.domain === "string" ? b.domain.trim() : "";

  if (!domain || domain.length < 3) {
    return NextResponse.json(
      { error: "Describe a domain or market (at least 3 characters)" },
      { status: 400 },
    );
  }

  const discovery = await createDiscovery({ domain });
  void startDiscovery(discovery.id);

  return NextResponse.json({ id: discovery.id }, { status: 201 });
}
