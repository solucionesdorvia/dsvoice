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
import { searchTerms, translateSubstanceName, stripAccents } from "@/lib/translations";

export const dynamic = "force-dynamic";

const DRAEGER_CDN = "https://www.draeger.com";
const PRODUCTS_DIR = path.join(process.cwd(), "public", "products");
let LOCAL_IMAGE_INDEX: Record<string, string> | null = null;

/**
 * Limpia nombres mal formateados que vienen del scrape original:
 * - Comillas envolventes ("cesio" → cesio)
 * - Comillas escapadas dobladas tipo CSV (""isodecilo"" → isodecilo)
 * - Saltos de línea/tabs internos colapsados a espacio
 * - Múltiples espacios → 1
 * - Caracteres "?" en patrones tipo "?,?'-" se convierten en "α,α'-" (alfa)
 *   porque ese es el caso común en química (compuestos diamino-aromáticos).
 * - Trim de espacios y puntuación residual.
 * - Capitaliza primera letra si está toda en minúscula.
 */
function cleanName(name: string | null | undefined): string {
  if (!name) return "";
  let s = String(name);
  // Colapsar whitespace (incluye \n, \t)
  s = s.replace(/\s+/g, " ");
  // Comillas dobles escapadas CSV: "" -> "
  s = s.replace(/""/g, '"');
  // Si está envuelto en comillas externas, sacarlas
  s = s.replace(/^["'\s]+/, "").replace(/["'\s]+$/, "");
  // Patrón "?,?'-" típico de pérdida de Unicode alpha → restaurar α
  s = s.replace(/\?,\?'/g, "α,α'");
  // Trim final
  s = s.trim();
  // Si todo el string es minúsculas y empieza con letra, capitalizar primera
  if (s && /^[a-záéíóúñ]/.test(s) && s === s.toLowerCase()) {
    s = s.charAt(0).toUpperCase() + s.slice(1);
  }
  return s;
}

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
  // Cap alto: total = 2.109 sustancias + 81 productos. Con 5000 cubrimos
  // sobradamente para que la búsqueda NUNCA se corte por límite.
  const limit = Math.min(Number(searchParams.get("limit") ?? 40), 5000);

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

  // Sin query y vista "Todos": solo productos como vitrina visual.
  // Las sustancias aparecen al buscar o al filtrar por "Sustancias".
  const showSubstancesNow = wantSubstances && (q !== "" || type === "substances");

  if (showSubstancesNow) {
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
        // Traemos hasta TODO el catálogo de sustancias para rankear; cap de
        // seguridad en 2500 (suficiente para las 2.109 indexadas).
        take: Math.min(Math.max(limit * 4, 60), 2500),
      })) as SubRow[];
    } else {
      // Filtro "Sustancias" sin query: muestra un set destacado (50 primeras
      // alfabéticamente) en vez de las 2.109 — más manejable visualmente.
      rows = (await prisma.substance.findMany({
        select: {
          id: true, name: true, formula: true, casNumber: true,
          synonyms: { select: { synonym: true } },
        },
        orderBy: { name: "asc" },
        take: Math.min(limit, 50),
      })) as SubRow[];
    }

    // Versión sin acentos del query para matching tolerante a tildes.
    const qNa = stripAccents(queryLower);
    substancesRanked = rows.map((r) => {
      // Normalizamos el nombre crudo antes de cualquier comparación.
      const cleanedName = cleanName(r.name);
      const nameLower = cleanedName.toLowerCase();
      const nameTr = translateSubstanceName(cleanedName).toLowerCase();
      const nameNa = stripAccents(nameLower);
      const nameTrNa = stripAccents(nameTr);
      const formula = (r.formula || "");
      const cas = (r.casNumber || "");
      const synLowers = r.synonyms.map((s) => (s.synonym || "").toLowerCase());
      const synNa = synLowers.map((s) => stripAccents(s));

      let score = 100;
      if (!q) {
        score = 50;
      } else if (nameNa === qNa || nameTrNa === qNa) score = 0;
      else if (nameNa.startsWith(qNa) || nameTrNa.startsWith(qNa)) score = 10;
      else if (queryDigits && cas === queryDigits) score = 20;
      else if (formula.toLowerCase() === queryLower) score = 30;
      else if (synNa.some((s) => s === qNa)) score = 40;
      else if (synNa.some((s) => s.startsWith(qNa))) score = 50;
      else if (nameNa.includes(qNa) || nameTrNa.includes(qNa)) score = 60;
      else if (queryDigits && cas.includes(queryDigits)) score = 70;
      else if (synNa.some((s) => s.includes(qNa))) score = 80;
      else if (formula.toLowerCase().includes(queryLower)) score = 90;

      return {
        kind: "substance" as const,
        id: r.id,
        name: translateSubstanceName(cleanedName),
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
    relatedTo?: string | null;
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
        // Productos: cap de seguridad en 200 (total real = 81).
        take: Math.min(Math.max(limit * 2, 60), 200),
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
        take: Math.min(limit, 200),
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

  // ---------- Cross-link: productos recomendados para la sustancia buscada ----------
  // Si el usuario busca una sustancia (ej "cloro"), traemos los equipos Dräger
  // recomendados PARA esa sustancia vía ProductRecommendation, aunque el texto
  // del producto no contenga la palabra buscada. Así "cloro" muestra sus
  // detectores correspondientes.
  if (q && wantProducts) {
    // Identificar la(s) sustancia(s) más relevantes para la query.
    let topSubs: Array<{ id: number; name: string }> = [];
    if (substancesRanked.length) {
      const ranked = substancesRanked
        .filter((s) => s.score <= 20) // exact / starts-with / CAS exacto
        .sort((a, b) => a.score - b.score);
      // Si hay una coincidencia muy fuerte (exacta o CAS exacto), usamos solo
      // esa para que los productos recomendados sean precisos. Si no, top 2.
      const best = ranked[0];
      if (best && best.score === 0) {
        topSubs = [{ id: best.id, name: best.name }];
      } else {
        topSubs = ranked.slice(0, 2).map((s) => ({ id: s.id, name: s.name }));
      }
    } else {
      // type=products: buscamos la sustancia top aparte para el cross-link.
      // Traemos varias y rankeamos para priorizar match exacto (ej "cloro"
      // → Cloro, no "3-clorotolueno" que alfabéticamente viene primero).
      const terms = searchTerms(q);
      const subs = await prisma.substance.findMany({
        where: {
          OR: terms.flatMap((t) => [
            { name: { contains: t, mode: "insensitive" as const } },
            { synonyms: { some: { synonym: { contains: t, mode: "insensitive" as const } } } },
          ]),
        },
        select: { id: true, name: true, synonyms: { select: { synonym: true } } },
        take: 30,
      });
      const qLow = q.toLowerCase();
      const ranked = subs
        .map((s) => {
          const cleaned = cleanName(s.name);
          const nLow = cleaned.toLowerCase();
          const nTr = translateSubstanceName(cleaned).toLowerCase();
          const synLow = s.synonyms.map((x) => (x.synonym || "").toLowerCase());
          let score = 100;
          if (nLow === qLow || nTr === qLow) score = 0;
          else if (synLow.some((x) => x === qLow)) score = 5;
          else if (nLow.startsWith(qLow) || nTr.startsWith(qLow)) score = 10;
          else if (synLow.some((x) => x.startsWith(qLow))) score = 20;
          else if (nLow.includes(qLow) || nTr.includes(qLow)) score = 60;
          return { id: s.id, name: translateSubstanceName(cleaned), score };
        })
        .sort((a, b) => a.score - b.score);
      const best = ranked[0];
      if (best && best.score === 0) {
        topSubs = [{ id: best.id, name: best.name }];
      } else {
        topSubs = ranked.slice(0, 2).map((s) => ({ id: s.id, name: s.name }));
      }
    }

    if (topSubs.length) {
      const subNameById = new Map(topSubs.map((s) => [s.id, s.name]));
      const recs = await prisma.productRecommendation.findMany({
        where: { substanceId: { in: topSubs.map((s) => s.id) } },
        select: { productId: true, substanceId: true, position: true },
        orderBy: { position: "asc" },
        take: 80,
      });
      // productId -> nombre de la sustancia que lo recomienda (la primera).
      const relatedByProduct = new Map<number, string>();
      for (const r of recs) {
        if (!relatedByProduct.has(r.productId)) {
          relatedByProduct.set(r.productId, subNameById.get(r.substanceId) ?? "");
        }
      }
      const recProductIds = Array.from(relatedByProduct.keys());
      if (recProductIds.length) {
        const existingSlugs = new Set(productsRanked.map((p) => p.slug));
        const recItems = (await prisma.safetyCatalogItem.findMany({
          where: {
            productId: { in: recProductIds },
            ...(category ? { category: { equals: category, mode: "insensitive" as const } } : {}),
          },
          select: {
            id: true, slug: true, name: true, category: true,
            description: true, imageSrc: true, href: true, productId: true,
          },
        })) as Array<ProductRow & { productId: number | null }>;

        for (const r of recItems) {
          if (existingSlugs.has(r.slug)) continue;
          existingSlugs.add(r.slug);
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
            // Score 5: aparecen justo después de la sustancia exacta (score 0),
            // antes de coincidencias débiles. Son altamente relevantes.
            score: 5,
            relatedTo: r.productId != null ? (relatedByProduct.get(r.productId) || null) : null,
          });
        }
      }
    }
  }

  // ---------- Mezclar y ordenar ----------
  // Sin query (preview inicial): priorizar productos (tienen foto, son más
  // visuales) y agregar algunas sustancias destacadas al final.
  // Con query: ordenar por score de relevancia.
  type Result =
    | (typeof substancesRanked[number] & { kind: "substance" })
    | (typeof productsRanked[number] & { kind: "product" });
  let merged: Result[];
  if (!q) {
    // Productos primero (todos), después sustancias.
    const productsFirst = productsRanked
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
    const substancesAfter = substancesRanked
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
    merged = [...productsFirst, ...substancesAfter].slice(0, limit);
  } else {
    merged = [...substancesRanked, ...productsRanked]
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return a.name.localeCompare(b.name);
      })
      .slice(0, limit);
  }

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
