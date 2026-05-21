import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX = 200;

// Drager.com bloquea hotlinking de sus imágenes (TLS fingerprinting agresivo).
// Las pre-bajamos a public/products/<slug>.jpg con Playwright y las servimos
// localmente. Si por algún motivo el slug no tiene asset local, devolvemos
// null para que el frontend muestre placeholder (en vez de imagen rota).
import { promises as fs } from "node:fs";
import path from "node:path";

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

const DRAEGER_CDN = "https://www.draeger.com";

async function absolutize<T extends { slug: string; imageSrc: string | null; href: string | null }>(item: T): Promise<T> {
  const local = await getLocalImage(item.slug);
  return {
    ...item,
    imageSrc: local
      ?? (item.imageSrc && item.imageSrc.startsWith("/") ? DRAEGER_CDN + item.imageSrc : item.imageSrc),
    href: item.href && item.href.startsWith("/") ? DRAEGER_CDN + item.href : item.href,
  };
}

/**
 * GET /api/catalog-safety/search?q=...
 * Búsqueda sobre el índice del catálogo DS SAFETY (tabla SafetyCatalogItem).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(Number(searchParams.get("limit") ?? 40), MAX);

  if (!q) {
    const items = await prisma.safetyCatalogItem.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
      take: limit,
      select: {
        id: true,
        slug: true,
        name: true,
        category: true,
        description: true,
        imageSrc: true,
        href: true,
      },
    });
    return NextResponse.json(await Promise.all(items.map(absolutize)));
  }

  const terms = q.split(/\s+/).filter((t) => t.length > 0);
  if (terms.length === 0) {
    return NextResponse.json([]);
  }

  const items = await prisma.safetyCatalogItem.findMany({
    where: {
      AND: terms.map((t) => ({
        searchText: { contains: t, mode: "insensitive" as const },
      })),
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    take: limit,
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      description: true,
      imageSrc: true,
      href: true,
    },
  });

  return NextResponse.json(await Promise.all(items.map(absolutize)));
}
