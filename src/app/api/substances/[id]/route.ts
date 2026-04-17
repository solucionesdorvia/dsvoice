import { NextResponse } from "next/server";

import { getSubstanceById } from "@/lib/substance-query";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const substance = await getSubstanceById(id);
  if (!substance) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(substance);
}
