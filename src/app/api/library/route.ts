import { NextResponse } from "next/server";

import { getLibrary, getLibraryItem, removeLibraryItem, upsertLibraryItem } from "@/lib/library/store";
import { LibraryItemInput, LibraryItemType } from "@/lib/library/types";

const TYPES: LibraryItemType[] = ["candidate", "report", "run"];

function isType(value: unknown): value is LibraryItemType {
  return typeof value === "string" && TYPES.includes(value as LibraryItemType);
}

function tags(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const itemId = url.searchParams.get("itemId");
  if (itemId) {
    const item = await getLibraryItem(itemId);
    return NextResponse.json({ saved: Boolean(item), item });
  }
  const library = await getLibrary();
  return NextResponse.json(library);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const id = typeof b.id === "string" ? b.id.trim() : "";
  const title = typeof b.title === "string" ? b.title.trim() : "";
  const href = typeof b.href === "string" ? b.href.trim() : "";

  if (!id || !title || !href || !isType(b.type)) {
    return NextResponse.json({ error: "Library item requires id, type, title, and href" }, { status: 400 });
  }

  const input: LibraryItemInput = {
    id,
    type: b.type,
    title,
    description: typeof b.description === "string" ? b.description : "",
    href,
    sourceId: typeof b.sourceId === "string" ? b.sourceId : undefined,
    parentId: typeof b.parentId === "string" ? b.parentId : undefined,
    score: typeof b.score === "number" ? b.score : undefined,
    tags: tags(b.tags),
    metadata: b.metadata && typeof b.metadata === "object" && !Array.isArray(b.metadata)
      ? b.metadata as LibraryItemInput["metadata"]
      : undefined,
  };
  const item = await upsertLibraryItem(input);
  return NextResponse.json({ item }, { status: 201 });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const itemId = url.searchParams.get("itemId")?.trim();
  if (!itemId) {
    return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
  }
  await removeLibraryItem(itemId);
  return NextResponse.json({ ok: true });
}
