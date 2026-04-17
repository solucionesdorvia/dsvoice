/**
 * Seeds the database from the scraped Dräger VOICE data in `scraped/`.
 *
 * Inputs:
 *   scraped/substances/{id}.json   - one per substance (see scrape-substance.ts)
 *   scraped/products.json          - aggregated product catalogue (see aggregate-products.ts)
 *
 * Usage:
 *   npx tsx prisma/seed-from-scrape.ts              # everything
 *   npx tsx prisma/seed-from-scrape.ts --only=50    # first 50 only
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";
import { recommendPPECategories } from "../src/lib/ppe";
import { rebuildSafetyCatalog } from "./seed-safety-catalog";

interface ScrapedSubstance {
  id: number;
  url: string;
  name: string;
  formula: string | null;
  casNumber: string | null;
  unNumber: string | null;
  ecNumber: string | null;
  hazardIdNumber: string | null;
  ghsPictograms: string[];
  hazardStatements: { code: string; text: string }[];
  chemical: {
    decompositionTempC?: number | null;
    meltingPointC?: number | null;
    boilingPointC?: number | null;
    densityGCm3?: number | null;
    ionizationEv?: number | null;
    flashPointC?: number | null;
    ignitionTempC?: number | null;
    vaporPressureHPa?: number | null;
    lelVolPct?: number | null;
    uelVolPct?: number | null;
    molarMassGMol?: number | null;
    raw: Record<string, string>;
  };
  productCategories: Array<{
    categoryGroup: string;
    category: string;
    products: Array<{
      name: string;
      tagline: string | null;
      features: string[];
      image: string | null;
      href: string | null;
    }>;
  }>;
}

interface AggregatedProduct {
  slug: string;
  name: string;
  tagline: string | null;
  features: string[];
  imageSrc: string | null;
  imageLocal: string | null;
  href: string | null;
}

const prisma = new PrismaClient();

function normalizeName(input: string): string {
  if (!input) return input;
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  // If the name already contains any uppercase letter, keep as-is.
  if (/[A-ZÁÉÍÓÚÑ]/.test(trimmed)) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function slugFromHref(href: string | null | undefined, fallback: string): string {
  if (href) {
    const m = href.match(/\/Products\/([^#?/]+)/i);
    if (m) return slugify(m[1]);
  }
  return slugify(fallback);
}

async function loadSubstances(): Promise<ScrapedSubstance[]> {
  const dir = "scraped/substances";
  const entries = await fs.readdir(dir);
  const out: ScrapedSubstance[] = [];
  for (const f of entries) {
    if (!f.endsWith(".json")) continue;
    const raw = await fs.readFile(path.join(dir, f), "utf8");
    try {
      out.push(JSON.parse(raw));
    } catch (err) {
      console.warn(`[load] ${f}: ${String(err)}`);
    }
  }
  out.sort((a, b) => a.id - b.id);
  return out;
}

async function loadProducts(): Promise<Map<string, AggregatedProduct>> {
  const raw = await fs.readFile("scraped/products.json", "utf8");
  const list = JSON.parse(raw) as AggregatedProduct[];
  const map = new Map<string, AggregatedProduct>();
  for (const p of list) map.set(p.slug, p);
  return map;
}

async function seedStatements(hazardStatements: ScrapedSubstance["hazardStatements"][number][]) {
  for (const hs of hazardStatements) {
    const code = hs.code;
    if (code.startsWith("H") && !code.startsWith("EUH")) {
      await prisma.hStatement.upsert({
        where: { code },
        create: { code, textEn: hs.text },
        update: { textEn: hs.text },
      });
    } else if (code.startsWith("P")) {
      await prisma.pStatement.upsert({
        where: { code },
        create: { code, textEn: hs.text },
        update: { textEn: hs.text },
      });
    } else if (code.startsWith("EUH")) {
      await prisma.hStatement.upsert({
        where: { code },
        create: { code, textEn: hs.text },
        update: { textEn: hs.text },
      });
    }
  }
}

async function upsertProducts(products: AggregatedProduct[]): Promise<Map<string, number>> {
  const ids = new Map<string, number>();
  for (const p of products) {
    const row = await prisma.product.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        features: p.features,
        imageSrc: p.imageSrc,
        imageLocal: p.imageLocal,
        href: p.href,
      },
      update: {
        name: p.name,
        tagline: p.tagline,
        features: p.features,
        imageSrc: p.imageSrc,
        imageLocal: p.imageLocal,
        href: p.href,
      },
    });
    ids.set(p.slug, row.id);
  }
  return ids;
}

async function main() {
  const args = process.argv.slice(2);
  const only = Number(args.find((a) => a.startsWith("--only="))?.split("=")[1] ?? "0") || 0;

  console.log("[seed] loading scraped JSONs…");
  const [subs, prodMap] = await Promise.all([loadSubstances(), loadProducts()]);
  console.log(`[seed] ${subs.length} substances, ${prodMap.size} unique products`);

  console.log("[seed] upserting products…");
  const productIds = await upsertProducts([...prodMap.values()]);
  console.log(`[seed] ${productIds.size} products in DB`);

  const slice = only > 0 ? subs.slice(0, only) : subs;
  console.log(`[seed] upserting ${slice.length} substances…`);
  const start = Date.now();
  for (let i = 0; i < slice.length; i++) {
    const s = slice[i];
    try {
      // Upsert by draegerId (primary key in Dräger's taxonomy) or CAS as fallback.
      const existing = await prisma.substance.findFirst({
        where: {
          OR: [
            { draegerId: s.id },
            ...(s.casNumber ? [{ casNumber: s.casNumber }] : []),
          ],
        },
      });
      const data = {
        draegerId: s.id,
        name: normalizeName(s.name),
        formula: s.formula,
        casNumber: s.casNumber ?? null,
        unNumber: s.unNumber ?? null,
        ecNumber: s.ecNumber ?? null,
        hazardIdNumber: s.hazardIdNumber ?? null,
      };
      const subRow = existing
        ? await prisma.substance.update({ where: { id: existing.id }, data })
        : await prisma.substance.create({ data });

      // GHS pictograms (replace)
      await prisma.substanceGHS.deleteMany({ where: { substanceId: subRow.id } });
      if (s.ghsPictograms.length > 0) {
        await prisma.substanceGHS.createMany({
          data: s.ghsPictograms.map((code) => ({
            substanceId: subRow.id,
            pictogramCode: code,
          })),
        });
      }

      // H/P statements: upsert the reference tables then link.
      await seedStatements(s.hazardStatements);
      await prisma.substanceHStatement.deleteMany({ where: { substanceId: subRow.id } });
      await prisma.substancePStatement.deleteMany({ where: { substanceId: subRow.id } });
      for (const hs of s.hazardStatements) {
        if (hs.code.startsWith("P")) {
          await prisma.substancePStatement.create({
            data: { substanceId: subRow.id, pCode: hs.code },
          });
        } else {
          await prisma.substanceHStatement.create({
            data: { substanceId: subRow.id, hCode: hs.code },
          });
        }
      }

      // Physical properties
      const ph = s.chemical;
      if (ph) {
        await prisma.physicalProperties.upsert({
          where: { substanceId: subRow.id },
          create: {
            substanceId: subRow.id,
            decompositionTempC: ph.decompositionTempC ?? null,
            meltingPointC: ph.meltingPointC ?? null,
            boilingPointC: ph.boilingPointC ?? null,
            densityGCm3: ph.densityGCm3 ?? null,
            ionizationEv: ph.ionizationEv ?? null,
            flashPointC: ph.flashPointC ?? null,
            ignitionTempC: ph.ignitionTempC ?? null,
            lelVolPct: ph.lelVolPct ?? null,
            uelVolPct: ph.uelVolPct ?? null,
            vaporPressureHPa: ph.vaporPressureHPa ?? null,
            molarMassGMol: ph.molarMassGMol ?? null,
            rawLabels: ph.raw as any,
          },
          update: {
            decompositionTempC: ph.decompositionTempC ?? null,
            meltingPointC: ph.meltingPointC ?? null,
            boilingPointC: ph.boilingPointC ?? null,
            densityGCm3: ph.densityGCm3 ?? null,
            ionizationEv: ph.ionizationEv ?? null,
            flashPointC: ph.flashPointC ?? null,
            ignitionTempC: ph.ignitionTempC ?? null,
            lelVolPct: ph.lelVolPct ?? null,
            uelVolPct: ph.uelVolPct ?? null,
            vaporPressureHPa: ph.vaporPressureHPa ?? null,
            molarMassGMol: ph.molarMassGMol ?? null,
            rawLabels: ph.raw as any,
          },
        });
      }

      // Product recommendations (Dräger's own assignment)
      await prisma.productRecommendation.deleteMany({ where: { substanceId: subRow.id } });
      let position = 0;
      const seen = new Set<string>();
      for (const cat of s.productCategories) {
        for (const p of cat.products) {
          const slug = slugFromHref(p.href, p.name);
          if (seen.has(slug)) continue;
          seen.add(slug);
          const pid = productIds.get(slug);
          if (!pid) continue;
          await prisma.productRecommendation.create({
            data: {
              substanceId: subRow.id,
              productId: pid,
              categoryGroup: cat.categoryGroup || null,
              category: cat.category,
              position: position++,
            },
          });
        }
      }

      // PPE heuristic (kept as secondary signal)
      const categories = recommendPPECategories({
        ghsPictograms: s.ghsPictograms,
        boilingPointC: ph?.boilingPointC ?? null,
        lelVolPct: ph?.lelVolPct ?? null,
        idlhPpm: null,
      });
      await prisma.substance.update({
        where: { id: subRow.id },
        data: { ppeCategories: categories },
      });

      if ((i + 1) % 50 === 0) {
        const elapsed = (Date.now() - start) / 1000;
        const rate = (i + 1) / Math.max(elapsed, 1);
        const eta = (slice.length - (i + 1)) / Math.max(rate, 0.01);
        console.log(
          `[seed] ${i + 1}/${slice.length} rate=${rate.toFixed(1)}/s eta=${(eta / 60).toFixed(1)}min`,
        );
      }
    } catch (err) {
      console.error(`[seed] id=${s.id} name=${s.name}: ${String(err)}`);
    }
  }

  await rebuildSafetyCatalog(prisma);

  const [nSubs, nProd, nRec, nGHS, nH, nP, nCat] = await Promise.all([
    prisma.substance.count(),
    prisma.product.count(),
    prisma.productRecommendation.count(),
    prisma.substanceGHS.count(),
    prisma.substanceHStatement.count(),
    prisma.substancePStatement.count(),
    prisma.safetyCatalogItem.count(),
  ]);
  console.log(
    `\n[seed] done. substances=${nSubs} products=${nProd} recommendations=${nRec} ghs=${nGHS} H-links=${nH} P-links=${nP} safety-catalog=${nCat}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
