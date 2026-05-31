import { NextResponse } from "next/server";

import { refreshCandidateReport } from "@/lib/discovery/reports";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const candidateId = typeof (body as { candidateId?: unknown }).candidateId === "string"
    ? (body as { candidateId: string }).candidateId
    : "";
  if (!candidateId) return NextResponse.json({ error: "candidateId is required" }, { status: 400 });
  try {
    return NextResponse.json(await refreshCandidateReport(id, candidateId));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to refresh report" }, { status: 404 });
  }
}
