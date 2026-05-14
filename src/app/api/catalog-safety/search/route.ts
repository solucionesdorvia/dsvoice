import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX = 200;

// Las imágenes y URLs de productos vienen como paths relativos al sitio de
// Dräger (ej: "/Media/Content/Products/..."). Las prefijamos para que
// carguen desde el CDN cuando el frontend está embebido en otro dominio.
const DRAEGER_CDN = "https://www.draeger.com";

function absolutize<T extends { imageSrc: string | null; href: string | null }>(item: T): T {
  return {
    ...item,
    imageSrc: item.imageSrc && item.imageSrc.startsWith("/") ? DRAEGER_CDN + item.imageSrc : item.imageSrc,
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
    return NextResponse.json(items.map(absolutize));
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

  return NextResponse.json(items.map(absolutize));
}
