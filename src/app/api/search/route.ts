/**
 * GET /api/search?q=...&type=all|substances|products&category=&limit=
 *
 * Búsqueda unificada que devuelve sustancias químicas + productos del
 * catálogo mezclados, ordenados por relevancia. Pensado para el frontend
 * con filtros (Todos / Sustancias / Productos).
 *
 * Cada resultado tiene un campo discriminator "kind" ("substance" o "product")
 * para que el frontend sepa cómo renderearlo y a qué endpoint pegarle al
 * abrir el detalle.
 */
import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

import { prisma } from "@/lib/prisma";
import { searchTerms, translateSubstanceName } from "@/lib/translations";

export const dynamic = "force-dynamic";

const DRAEGER_CDN = "https://www.draeger.com";
const PRODUCTS_DIR = path.join(process.cwd(), "public", "products");
let LOCAL_IMAGE_INDEX: Record<string, string> | null = null;

async function getLocalImage(slug: string): Promise<string | null> {
  if (!slug) return null;
  if (!LOCAL_IMAGE_INDEX) {
    try {
      const files = await fs.readdir(PRODUCTS_DIR);
      LOCAL_IMAGE_INDEX = {};
      for (const f of files) {
        const ext = path.extname(f);
        const base = f.slice(0, -ext.length);
        LOCAL_IMAGE_INDEX[base] = "/products/" + f;
      }
    } catch {
      LOCAL_IMAGE_INDEX = {};
    }
  }
  return LOCAL_IMAGE_INDEX[slug] ?? null;
}

function absUrl(u: string | null): string | null {
  if (!u) return null;
  if (u.startsWith("http")) return u;
  if (u.startsWith("/")) return DRAEGER_CDN + u;
  return u;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const type = (searchParams.get("type") ?? "all").toLowerCase();
  const category = (searchParams.get("category") ?? "").trim();
  const limit = Math.min(Number(searchParams.get("limit") ?? 40), 100);

  const wantSubstances = type === "all" || type === "substances";
  const wantProducts   = type === "all" || type === "products";

  // ---------- Sustancias ----------
  type SubRow = {
    id: number;
    name: string;
    formula: string | null;
    casNumber: string | null;
    synonyms: { synonym: string }[];
  };
  let substancesRanked: Array<{
    kind: "substance";
    id: number;
    name: string;
    casNumber: string | null;
    formula: string | null;
    score: number;
  }> = [];

  if (wantSubstances) {
    const queryLower = q.toLowerCase();
    const queryDigits = q.replace(/[^0-9-]/g, "");
    let rows: SubRow[] = [];

    if (q) {
      const terms = searchTerms(q);
      rows = (await prisma.substance.findMany({
        where: {
          OR: terms.flatMap((t) => [
            { name: { contains: t, mode: "insensitive" as const } },
            { casNumber: { contains: t, mode: "insensitive" as const } },
            { formula: { contains: t, mode: "insensitive" as const } },
            { synonyms: { some: { synonym: { contains: t, mode: "insensitive" as const } } } },
          ]),
        },
        select: {
          id: true, name: true, formula: true, casNumber: true,
          synonyms: { select: { synonym: true } },
        },
        take: Math.max(limit * 4, 60),
      })) as SubRow[];
    } else {
      // Sin query: mostrar las primeras (alfabético) para landing.
      rows = (await prisma.substance.findMany({
        select: {
          id: true, name: true, formula: true, casNumber: true,
          synonyms: { select: { synonym: true } },
        },
        orderBy: { name: "asc" },
        take: limit,
      })) as SubRow[];
    }

    substancesRanked = rows.map((r) => {
      const nameLower = (r.name || "").toLowerCase();
      const nameTr = translateSubstanceName(r.name).toLowerCase();
      const formula = (r.formula || "");
      const cas = (r.casNumber || "");
      const synLowers = r.synonyms.map((s) => (s.synonym || "").toLowerCase());

      let score = 100;
      if (!q) {
        score = 50;
      } else if (nameLower === queryLower || nameTr === queryLower) score = 0;
      else if (nameLower.startsWith(queryLower) || nameTr.startsWith(queryLower)) score = 10;
      else if (queryDigits && cas === queryDigits) score = 20;
      else if (formula.toLowerCase() === queryLower) score = 30;
      else if (synLowers.some((s) => s === queryLower)) score = 40;
      else if (synLowers.some((s) => s.startsWith(queryLower))) score = 50;
      else if (nameLower.includes(queryLower) || nameTr.includes(queryLower)) score = 60;
      else if (queryDigits && cas.includes(queryDigits)) score = 70;
      else if (synLowers.some((s) => s.includes(queryLower))) score = 80;
      else if (formula.toLowerCase().includes(queryLower)) score = 90;

      return {
        kind: "substance" as const,
        id: r.id,
        name: translateSubstanceName(r.name),
        casNumber: r.casNumber,
        formula: r.formula,
        score,
      };
    });
  }

  // ---------- Productos ----------
  type ProductRow = {
    id: number;
    slug: string;
    name: string;
    category: string;
    description: string | null;
    imageSrc: string | null;
    href: string | null;
    searchText: string | null;
  };
  const productsRanked: Array<{
    kind: "product";
    id: number;
    slug: string;
    name: string;
    category: string;
    description: string | null;
    imageSrc: string | null;
    href: string | null;
    score: number;
  }> = [];

  if (wantProducts) {
    const queryLower = q.toLowerCase();
    let rows: ProductRow[] = [];

    if (q) {
      const terms = q.split(/\s+/).filter((t) => t.length > 0);
      rows = (await prisma.safetyCatalogItem.findMany({
        where: {
          AND: terms.map((t) => ({
            searchText: { contains: t, mode: "insensitive" as const },
          })),
          ...(category ? { category: { equals: category, mode: "insensitive" as const } } : {}),
        },
        select: {
          id: true, slug: true, name: true, category: true,
          description: true, imageSrc: true, href: true, searchText: true,
        },
        take: Math.max(limit * 2, 60),
      })) as ProductRow[];
    } else {
      rows = (await prisma.safetyCatalogItem.findMany({
        where: category
          ? { category: { equals: category, mode: "insensitive" as const } }
          : undefined,
        select: {
          id: true, slug: true, name: true, category: true,
          description: true, imageSrc: true, href: true, searchText: true,
        },
        orderBy: [{ category: "asc" }, { name: "asc" }],
        take: limit,
      })) as ProductRow[];
    }

    for (const r of rows) {
      const nameLower = (r.name || "").toLowerCase();
      const slugLower = (r.slug || "").toLowerCase();
      const catLower  = (r.category || "").toLowerCase();
      const descLower = (r.description || "").toLowerCase();

      let score = 100;
      if (!q) {
        score = 50;
      } else if (nameLower === queryLower) score = 0;
      else if (nameLower.startsWith(queryLower)) score = 10;
      else if (slugLower === queryLower) score = 15;
      else if (slugLower.includes(queryLower)) score = 20;
      else if (nameLower.includes(queryLower)) score = 30;
      else if (catLower.includes(queryLower)) score = 50;
      else if (descLower.includes(queryLower)) score = 70;

      const localImg = await getLocalImage(r.slug);
      productsRanked.push({
        kind: "product" as const,
        id: r.id,
        slug: r.slug,
        name: r.name,
        category: r.category,
        description: r.description,
        imageSrc: localImg ?? absUrl(r.imageSrc),
        href: absUrl(r.href),
        score,
      });
    }
  }

  // ---------- Mezclar y ordenar por score (lo más relevante arriba) ----------
  type Result =
    | (typeof substancesRanked[number] & { kind: "substance" })
    | (typeof productsRanked[number] & { kind: "product" });
  const merged: Result[] = [
    ...substancesRanked,
    ...productsRanked,
  ].sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return a.name.localeCompare(b.name);
  }).slice(0, limit);

  // Extras útiles para el frontend: lista de categorías de productos en los
  // resultados (para mostrar como filtros secundarios).
  const categories = Array.from(
    new Set(productsRanked.map((p) => p.category).filter(Boolean))
  ).sort();

  return NextResponse.json({
    q,
    type,
    category,
    total: merged.length,
    counts: {
      substances: substancesRanked.length,
      products: productsRanked.length,
    },
    categories,
    results: merged.map(({ score: _, ...rest }) => {
      void _;
      return rest;
    }),
  });
}
