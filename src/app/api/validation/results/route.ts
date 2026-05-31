import { NextResponse } from "next/server";

import { importValidationResult, listValidationResults } from "@/lib/validation/results";

export async function GET() {
  return NextResponse.json({ results: await listValidationResults() });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const raw = typeof (body as { raw?: unknown }).raw === "string" ? (body as { raw: string }).raw.trim() : "";
  const source = (body as { source?: unknown }).source === "csv" ? "csv" : "text";
  if (!raw) return NextResponse.json({ error: "Paste CSV or validation notes first" }, { status: 400 });
  return NextResponse.json({ result: await importValidationResult(raw, source) }, { status: 201 });
}
