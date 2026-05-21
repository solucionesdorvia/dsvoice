import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { searchTerms, translateSubstanceName } from "@/lib/translations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(Number(searchParams.get("limit") ?? 10), 25);

  // Sin query: devolver las primeras sustancias (alfabéticas) para que el
  // usuario vea contenido al abrir el buscador, en vez de estado vacío.
  if (!q) {
    const results = await prisma.substance.findMany({
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

  // Busca también la traducción al inglés (la BD guarda nombres en inglés de PubChem).
  const terms = searchTerms(q);

  // Traemos un set amplio y rankeamos en memoria. El sort alfabético de
  // Postgres hundía las coincidencias exactas (ej. "cloro" devolvía
  // "1,1,1-tricloroetano" primero porque venía antes en orden alfabético).
  const RAW = await prisma.substance.findMany({
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
    select: {
      id: true,
      name: true,
      formula: true,
      casNumber: true,
      synonyms: { select: { synonym: true } },
    },
    take: Math.max(limit * 4, 60),
  });

  // Ranking: cuanto más bajo el score, más arriba aparece.
  // 1) name == q exacto
  // 2) name comienza con q
  // 3) CAS == q
  // 4) name contiene q
  // 5) formula == q (case-sensitive)
  // 6) algún sinónimo == q
  // 7) algún sinónimo comienza con q
  // 8) algún sinónimo o CAS o formula contiene q
  const queryLower = q.toLowerCase();
  const queryDigits = q.replace(/[^0-9-]/g, "");
  function scoreOf(r: typeof RAW[number]): number {
    const nameLower = (r.name || "").toLowerCase();
    const nameTranslated = translateSubstanceName(r.name).toLowerCase();
    const formula = (r.formula || "");
    const cas = (r.casNumber || "");
    const synLowers = r.synonyms.map((s) => (s.synonym || "").toLowerCase());

    if (nameLower === queryLower || nameTranslated === queryLower) return 0;
    if (nameLower.startsWith(queryLower) || nameTranslated.startsWith(queryLower)) return 10;
    if (queryDigits && cas === queryDigits) return 20;
    if (formula.toLowerCase() === queryLower) return 30;
    if (synLowers.some((s) => s === queryLower)) return 40;
    if (synLowers.some((s) => s.startsWith(queryLower))) return 50;
    if (nameLower.includes(queryLower) || nameTranslated.includes(queryLower)) return 60;
    if (queryDigits && cas.includes(queryDigits)) return 70;
    if (synLowers.some((s) => s.includes(queryLower))) return 80;
    if (formula.toLowerCase().includes(queryLower)) return 90;
    return 100;
  }

  const ranked = RAW
    .map((r) => ({ r, score: scoreOf(r) }))
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      // Empate → alfabético por nombre traducido
      return translateSubstanceName(a.r.name).localeCompare(
        translateSubstanceName(b.r.name),
      );
    })
    .slice(0, limit)
    .map(({ r }) => ({
      id: r.id,
      name: translateSubstanceName(r.name),
      formula: r.formula,
      casNumber: r.casNumber,
    }));

  return NextResponse.json(ranked);
}
