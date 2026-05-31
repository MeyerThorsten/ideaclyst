import { NextResponse } from "next/server";

import { listSourceLanes, saveSourceLanes } from "@/lib/research/source-lanes";

export async function GET() {
  return NextResponse.json({ lanes: await listSourceLanes() });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const lanes = Array.isArray((body as { lanes?: unknown }).lanes)
    ? (body as { lanes: Partial<import("@/lib/research/source-lanes").SourceLaneTemplate>[] }).lanes
    : [];
  return NextResponse.json({ lanes: await saveSourceLanes(lanes) });
}
