import { Prisma } from "@prisma/client";
import { promises as fs } from "node:fs";
import path from "node:path";

import { prisma } from "./prisma";
import { resolveStatement, H_STATEMENTS, P_STATEMENTS } from "./statements";

// Index local de imágenes de productos pre-bajadas (public/products/<slug>.ext)
// para sortear el anti-hotlinking de draeger.com.
const PRODUCTS_DIR = path.join(process.cwd(), "public", "products");
let LOCAL_PRODUCT_IMAGES: Record<string, string> | null = null;
async function getLocalProductImage(slug: string): Promise<string | null> {
  if (!slug) return null;
  if (!LOCAL_PRODUCT_IMAGES) {
    try {
      const files = await fs.readdir(PRODUCTS_DIR);
      LOCAL_PRODUCT_IMAGES = {};
      for (const f of files) {
        const ext = path.extname(f);
        const base = f.slice(0, -ext.length);
        LOCAL_PRODUCT_IMAGES[base] = "/products/" + f;
      }
    } catch {
      LOCAL_PRODUCT_IMAGES = {};
    }
  }
  return LOCAL_PRODUCT_IMAGES[slug] ?? null;
}

// The canonical "full substance" include shape — used by both the [id] and
// [cas] detail routes as well as the detail page itself.
export const substanceInclude = {
  ghsPictograms: true,
  exposureLimits: {
    orderBy: [{ authority: "asc" }, { limitType: "asc" }],
  },
  hStatements: { include: { hStatement: true } },
  pStatements: { include: { pStatement: true } },
  physicalProps: true,
  synonyms: { orderBy: { synonym: "asc" } },
  products: {
    orderBy: { position: "asc" },
    include: { product: true },
  },
} satisfies Prisma.SubstanceInclude;

type SubstanceWithRelations = Prisma.SubstanceGetPayload<{
  include: typeof substanceInclude;
}>;

export async function getSubstanceById(id: number) {
  const s = await prisma.substance.findUnique({
    where: { id },
    include: substanceInclude,
  });
  return s ? await serializeSubstance(s) : null;
}

export async function getSubstanceByCas(cas: string) {
  const s = await prisma.substance.findUnique({
    where: { casNumber: cas },
    include: substanceInclude,
  });
  return s ? await serializeSubstance(s) : null;
}

// Shape the raw Prisma object into a UI-friendly structure with resolved
// H/P statement text and a stable pictogram list.
async function serializeSubstance(s: SubstanceWithRelations) {
  return {
    id: s.id,
    name: s.name,
    formula: s.formula,
    casNumber: s.casNumber,
    unNumber: s.unNumber,
    ecNumber: s.ecNumber,
    hazardIdNumber: s.hazardIdNumber,
    pubchemCid: s.pubchemCid,
    ppeCategories: s.ppeCategories,
    ghsPictograms: s.ghsPictograms
      .map((g) => g.pictogramCode)
      .sort((a, b) => a.localeCompare(b)),
    exposureLimits: s.exposureLimits.map((l) => ({
      id: l.id,
      countryCode: l.countryCode,
      authority: l.authority,
      limitType: l.limitType,
      valuePpm: l.valuePpm,
      valueMgM3: l.valueMgM3,
      notes: l.notes,
    })),
    // We prefer the curated Spanish text from statements.ts over whatever
    // text was captured during scraping (Dräger's API occasionally returns the
    // English wording). Combined codes like "H301+H311+H331" are resolved by
    // joining their individual entries.
    hStatements: s.hStatements.map((h) => ({
      code: h.hCode,
      text: resolveStatement(h.hCode, H_STATEMENTS) || h.hStatement?.textEn || h.hCode,
    })),
    pStatements: s.pStatements.map((p) => ({
      code: p.pCode,
      text: resolveStatement(p.pCode, P_STATEMENTS) || p.pStatement?.textEn || p.pCode,
    })),
    physicalProps: s.physicalProps
      ? {
          decompositionTempC: s.physicalProps.decompositionTempC,
          meltingPointC: s.physicalProps.meltingPointC,
          boilingPointC: s.physicalProps.boilingPointC,
          densityGCm3: s.physicalProps.densityGCm3,
          ionizationEv: s.physicalProps.ionizationEv,
          flashPointC: s.physicalProps.flashPointC,
          ignitionTempC: s.physicalProps.ignitionTempC,
          lelVolPct: s.physicalProps.lelVolPct,
          uelVolPct: s.physicalProps.uelVolPct,
          vaporPressureHPa: s.physicalProps.vaporPressureHPa,
          molarMassGMol: s.physicalProps.molarMassGMol,
          hazardousEffects: s.physicalProps.hazardousEffects,
        }
      : null,
    synonyms: s.synonyms.map((sn) => sn.synonym),
    products: await Promise.all(
      s.products.map(async (rec) => ({
        slug: rec.product.slug,
        name: rec.product.name,
        tagline: rec.product.tagline,
        features: rec.product.features,
        imageLocal: rec.product.imageLocal,
        imageSrc:
          (await getLocalProductImage(rec.product.slug)) ?? rec.product.imageSrc,
        href: rec.product.href,
        categoryGroup: rec.categoryGroup,
        category: rec.category,
      })),
    ),
  };
}
