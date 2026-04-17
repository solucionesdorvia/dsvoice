import { NextResponse } from "next/server";

import { autocomplete } from "@/lib/pubchem";

export const dynamic = "force-dynamic";

// GET /api/pubchem/autocomplete?q=ben — proxies PubChem's autocomplete service
// with Redis caching so we can suggest external substances when the local DB
// has no match for the user's query.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json([]);
  const suggestions = await autocomplete(q);
  return NextResponse.json(suggestions);
}
