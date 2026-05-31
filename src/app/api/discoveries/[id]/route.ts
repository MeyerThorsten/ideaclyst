/** GET one discovery (polled by the discovery detail page). */

import { NextResponse } from "next/server";

import { getDiscovery } from "@/lib/discovery/store";
import { rankDiscoveryForProfile } from "@/lib/discovery/ranking";
import { getFounderProfile } from "@/lib/profile/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const discovery = await getDiscovery(id);
  if (!discovery) {
    return NextResponse.json({ error: "Discovery not found" }, { status: 404 });
  }
  const profile = await getFounderProfile();
  return NextResponse.json({ discovery: rankDiscoveryForProfile(discovery, profile) });
}
