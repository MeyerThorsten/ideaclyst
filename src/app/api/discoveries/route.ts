/**
 * Discoveries collection endpoint.
 *   GET  → list all discoveries (newest first)
 *   POST → validate the brief (market + goal + capacity), create a queued
 *          discovery, fire scouting in the background (NOT awaited), return { id }.
 */

import { NextResponse } from "next/server";

import { createDiscovery, listDiscoveries } from "@/lib/discovery/store";
import { startDiscovery } from "@/lib/discovery/orchestrator";
import {
  DISCOVERY_GOALS,
  DISCOVERY_CAPACITIES,
  DiscoveryGoal,
  DiscoveryCapacity,
} from "@/lib/discovery/types";

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
  const goal = (typeof b.goal === "string" ? b.goal : "") as DiscoveryGoal;
  const capacity = (typeof b.capacity === "string" ? b.capacity : "") as DiscoveryCapacity;

  if (!domain || domain.length < 3) {
    return NextResponse.json(
      { error: "Describe a market or space (at least 3 characters)" },
      { status: 400 },
    );
  }
  if (!DISCOVERY_GOALS.includes(goal)) {
    return NextResponse.json(
      { error: `Goal must be one of: ${DISCOVERY_GOALS.join(", ")}` },
      { status: 400 },
    );
  }
  if (!DISCOVERY_CAPACITIES.includes(capacity)) {
    return NextResponse.json(
      { error: `Capacity must be one of: ${DISCOVERY_CAPACITIES.join(", ")}` },
      { status: 400 },
    );
  }

  const discovery = await createDiscovery({
    domain,
    goal,
    capacity,
    constraints: typeof b.constraints === "string" ? b.constraints : undefined,
  });
  void startDiscovery(discovery.id);

  return NextResponse.json({ id: discovery.id }, { status: 201 });
}
