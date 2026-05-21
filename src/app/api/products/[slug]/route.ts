import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DRAEGER_CDN = "https://www.draeger.com";
const PRODUCTS_DIR = path.join(process.cwd(), "public", "products");
const SCRAPED_DETAILS_DIR = path.join(process.cwd(), "scraped", "product-details");
let LOCAL_IMAGE_INDEX: Record<string, string> | null = null;

interface ScrapedDetail {
  overview: { text: string | null; htmlSummary: string | null } | null;
  specifications: { group: string; rows: { key: string; value: string }[] }[];
  system: { name: string; href: string | null; imageSrc: string | null }[];
  downloads: { label: string; href: string; type: string | null }[];
  similar: { name: string; slug: string | null; href: string | null; imageSrc: string | null }[];
}

async function getScrapedDetail(slug: string): Promise<ScrapedDetail | null> {
  try {
    const raw = await fs.readFile(path.join(SCRAPED_DETAILS_DIR, slug + ".json"), "utf-8");
    return JSON.parse(raw) as ScrapedDetail;
  } catch {
    return null;
  }
}

// Prefija www.draeger.com a hrefs relativos de descargas/sistema/similares.
function absolutizeUrl(u: string | null): string | null {
  if (!u) return null;
  if (u.startsWith("http")) return u;
  if (u.startsWith("/")) return DRAEGER_CDN + u;
  return u;
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

/**
 * GET /api/products/:slug
 * Devuelve el detalle completo de un producto del catálogo:
 *   - identificación: slug, name, category, tagline
 *   - descripción: description (resumen) + features (bullets)
 *   - assets: imageSrc local, href oficial Drager
 *
 * TODO: cuando el scraper profundo esté corriendo, agregar:
 *   - specifications (tabla de specs técnicas)
 *   - system (componentes / accesorios compatibles)
 *   - downloads (PDFs, manuales)
 *   - related (productos similares)
 */
export async function GET(
  _request: Request,
  { params }: { params: { slug: string } },
) {
  const slug = decodeURIComponent(params.slug || "").trim();
  if (!slug) {
    return NextResponse.json({ error: "missing slug" }, { status: 400 });
  }

  // Buscamos por slug primero en Product (tiene features/tagline) y completamos
  // con SafetyCatalogItem si existe (tiene category limpia y description).
  const [product, catalog] = await Promise.all([
    prisma.product.findUnique({ where: { slug } }),
    prisma.safetyCatalogItem.findUnique({ where: { slug } }),
  ]);

  if (!product && !catalog) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const [localImg, scraped] = await Promise.all([
    getLocalImage(slug),
    getScrapedDetail(slug),
  ]);
  const rawImage = product?.imageSrc ?? catalog?.imageSrc ?? null;
  const rawHref  = product?.href     ?? catalog?.href     ?? null;

  return NextResponse.json({
    slug,
    name:        product?.name        ?? catalog?.name        ?? slug,
    category:    catalog?.category    ?? null,
    tagline:     product?.tagline     ?? null,
    description: catalog?.description ?? null,
    features:    product?.features    ?? [],
    imageSrc:    localImg ?? absolutizeUrl(rawImage),
    href:        absolutizeUrl(rawHref),
    // Datos del scraper profundo (si ya scrapeamos este slug).
    overview:       scraped?.overview ?? null,
    specifications: scraped?.specifications ?? [],
    downloads: (scraped?.downloads ?? []).map((d) => ({
      label: d.label,
      href:  absolutizeUrl(d.href),
      type:  d.type,
    })),
    system: (scraped?.system ?? []).map((s) => ({
      name: s.name,
      href: absolutizeUrl(s.href),
      imageSrc: absolutizeUrl(s.imageSrc),
    })),
    related: (scraped?.similar ?? []).map((s) => ({
      name: s.name,
      slug: s.slug,
      href: absolutizeUrl(s.href),
      imageSrc: absolutizeUrl(s.imageSrc),
    })),
  });
}
