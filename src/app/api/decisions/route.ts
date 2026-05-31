import { NextResponse } from "next/server";

import { addDecision, listDecisions, DecisionType } from "@/lib/decisions/store";

const TYPES: DecisionType[] = ["promoted", "parked", "killed", "validated", "note"];

export async function GET() {
  return NextResponse.json({ decisions: await listDecisions() });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const type = typeof b.type === "string" && TYPES.includes(b.type as DecisionType) ? b.type as DecisionType : "note";
  const title = typeof b.title === "string" ? b.title.trim().slice(0, 160) : "";
  const evidence = typeof b.evidence === "string" ? b.evidence.trim().slice(0, 1000) : "";
  const rationale = typeof b.rationale === "string" ? b.rationale.trim().slice(0, 1000) : "";
  const href = typeof b.href === "string" ? b.href.trim().slice(0, 300) : undefined;
  if (!title || !rationale) {
    return NextResponse.json({ error: "Decision title and rationale are required" }, { status: 400 });
  }
  return NextResponse.json({ decision: await addDecision({ type, title, evidence, rationale, href }) }, { status: 201 });
}
