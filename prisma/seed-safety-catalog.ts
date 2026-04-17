/**
 * Construye el índice del catálogo DS SAFETY a partir de la tabla `Product`
 * (productos agregados desde Dräger VOICE / mismo universo que el PDF comercial).
 *
 * Uso: npx tsx prisma/seed-safety-catalog.ts
 * También se invoca al final de `seed-from-scrape.ts`.
 */
import { PrismaClient } from "@prisma/client";

function slugToKeywords(slug: string): string[] {
  return [...new Set(slug.split("-").filter((w) => w.length > 1))];
}

export async function rebuildSafetyCatalog(prisma: PrismaClient): Promise<number> {
  console.log("[safety-catalog] reconstruyendo desde Product…");
  const products = await prisma.product.findMany({
    include: {
      recommendations: { select: { category: true, categoryGroup: true } },
    },
  });

  let n = 0;
  for (const p of products) {
    const cats = [...new Set(p.recommendations.map((r) => r.category))];
    const groups = [
      ...new Set(
        p.recommendations.map((r) => r.categoryGroup).filter((g): g is string => Boolean(g)),
      ),
    ];
    const category =
      cats.length > 0
        ? cats.sort((a, b) => a.localeCompare(b, "es"))[0]
        : "Catálogo general Dräger";

    const desc = [p.tagline, ...p.features].filter(Boolean).join("\n\n");
    const searchText = [
      p.name,
      p.slug.replace(/-/g, " "),
      p.tagline,
      ...p.features,
      ...cats,
      ...groups,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const keywords = [
      ...new Set([...cats, ...groups, ...slugToKeywords(p.slug)]),
    ];

    await prisma.safetyCatalogItem.upsert({
      where: { slug: p.slug },
      create: {
        productId: p.id,
        slug: p.slug,
        name: p.name,
        category,
        description: desc || null,
        searchText,
        imageSrc: p.imageSrc ?? p.imageLocal,
        href: p.href,
        keywords,
      },
      update: {
        productId: p.id,
        name: p.name,
        category,
        description: desc || null,
        searchText,
        imageSrc: p.imageSrc ?? p.imageLocal,
        href: p.href,
        keywords,
      },
    });
    n++;
  }

  console.log(`[safety-catalog] ${n} entradas en SafetyCatalogItem`);
  return n;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await rebuildSafetyCatalog(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

// Solo al ejecutar este archivo directamente (no al importarlo desde seed-from-scrape).
const runDirect =
  typeof process !== "undefined" &&
  process.argv[1]?.includes("seed-safety-catalog");
if (runDirect) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
