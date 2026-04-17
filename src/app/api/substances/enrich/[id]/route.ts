import { NextResponse } from "next/server";

import { enrichSubstance } from "@/lib/enrich";
import { getSubstanceById } from "@/lib/substance-query";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/substances/enrich/[id] — re-fetch PubChem data and refresh
// GHS, H/P statements, synonyms, PPE categories, etc. for an existing substance.
export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  try {
    await enrichSubstance(id);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "enrichment failed" },
      { status: 500 }
    );
  }
  const substance = await getSubstanceById(id);
  return NextResponse.json(substance);
}
