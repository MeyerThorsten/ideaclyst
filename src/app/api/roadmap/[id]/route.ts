import { NextResponse } from "next/server";

import { getAnalysis } from "@/lib/roadmap/store";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await getAnalysis(id);
  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }
  return NextResponse.json({ analysis });
}
