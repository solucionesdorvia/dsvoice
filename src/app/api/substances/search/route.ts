import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { searchTerms, translateSubstanceName } from "@/lib/translations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(Number(searchParams.get("limit") ?? 10), 25);

  if (!q) return NextResponse.json([]);

  // Busca también la traducción al inglés (la BD guarda nombres en inglés de PubChem).
  const terms = searchTerms(q);

  const results = await prisma.substance.findMany({
    where: {
      OR: terms.flatMap((t) => [
        { name: { contains: t, mode: "insensitive" as const } },
        { casNumber: { contains: t, mode: "insensitive" as const } },
        { formula: { contains: t, mode: "insensitive" as const } },
        {
          synonyms: {
            some: { synonym: { contains: t, mode: "insensitive" as const } },
          },
        },
      ]),
    },
    select: { id: true, name: true, formula: true, casNumber: true },
    orderBy: { name: "asc" },
    take: limit,
  });

  const localized = results.map((r) => ({
    ...r,
    name: translateSubstanceName(r.name),
  }));

  return NextResponse.json(localized);
}
