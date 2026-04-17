import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX = 60;

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
    return NextResponse.json(items);
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

  return NextResponse.json(items);
}
