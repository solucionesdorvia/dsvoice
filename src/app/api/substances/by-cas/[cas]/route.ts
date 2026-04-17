import { NextResponse } from "next/server";

import { getSubstanceByCas } from "@/lib/substance-query";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { cas: string } }
) {
  const cas = decodeURIComponent(params.cas).trim();
  if (!cas) return NextResponse.json({ error: "missing cas" }, { status: 400 });
  const substance = await getSubstanceByCas(cas);
  if (!substance) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(substance);
}
