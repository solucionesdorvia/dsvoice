// Seed script: upsert curated substances + exposure limits + physical properties,
// then enrich from PubChem (GHS pictograms, H/P statements, synonyms).
// Usage:
//   npm run seed           # all substances
//   npm run seed -- --skip-enrich   # DB only, no PubChem calls
//   npm run seed -- --only=10       # first N substances (for quick tests)

import { PrismaClient } from "@prisma/client";

import { SEED_SUBSTANCES, type SeedSubstance } from "./seed-data";
import { SEED_SUBSTANCES_EXTRA } from "./seed-data-extra";
import { SEED_SUBSTANCES_EXTRA_2 } from "./seed-data-extra-2";
import { SEED_SUBSTANCES_EXTRA_3 } from "./seed-data-extra-3";
import { enrichSubstance } from "../src/lib/enrich";
import { recommendPPECategories } from "../src/lib/ppe";

// Combina todas las listas deduplicando por CAS. Se queda la primera versión
// que aparece (orden: seed-data curado → extra → extra-2 → extra-3).
function mergedSeed(): SeedSubstance[] {
  const byCas = new Map<string, SeedSubstance>();
  for (const s of SEED_SUBSTANCES) {
    byCas.set(s.casNumber, s);
  }
  for (const s of [
    ...SEED_SUBSTANCES_EXTRA,
    ...SEED_SUBSTANCES_EXTRA_2,
    ...SEED_SUBSTANCES_EXTRA_3,
  ]) {
    if (!byCas.has(s.casNumber)) byCas.set(s.casNumber, s);
  }
  return Array.from(byCas.values());
}

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const SKIP_ENRICH = args.includes("--skip-enrich");
const ONLY = Number(args.find((a) => a.startsWith("--only="))?.split("=")[1] ?? "0") || 0;
const FROM = Number(args.find((a) => a.startsWith("--from="))?.split("=")[1] ?? "0") || 0;

// PubChem rate limit: 5 req/s. We do ~3 calls per substance (properties,
// synonyms, GHS view). Throttle to ~1.5 substances per second = safe.
const SUBSTANCE_DELAY_MS = 700;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function upsertSubstance(s: SeedSubstance): Promise<number> {
  const existing = s.casNumber
    ? await prisma.substance.findUnique({ where: { casNumber: s.casNumber } })
    : await prisma.substance.findFirst({ where: { name: s.name } });

  const data = {
    name: s.name,
    casNumber: s.casNumber,
    formula: s.formula,
    unNumber: s.unNumber,
    ecNumber: s.ecNumber,
  };

  const substance = existing
    ? await prisma.substance.update({ where: { id: existing.id }, data })
    : await prisma.substance.create({ data });

  // Replace exposure limits
  if (s.limits && s.limits.length > 0) {
    await prisma.exposureLimit.deleteMany({ where: { substanceId: substance.id } });
    await prisma.exposureLimit.createMany({
      data: s.limits.map((l) => ({
        substanceId: substance.id,
        countryCode: l.countryCode,
        authority: l.authority,
        limitType: l.limitType,
        valuePpm: l.ppm ?? null,
        valueMgM3: l.mgM3 ?? null,
        notes: l.notes ?? null,
      })),
    });
  }

  // Upsert physical properties
  if (s.physical) {
    await prisma.physicalProperties.upsert({
      where: { substanceId: substance.id },
      create: {
        substanceId: substance.id,
        boilingPointC: s.physical.boilingPointC ?? null,
        meltingPointC: s.physical.meltingPointC ?? null,
        flashPointC: s.physical.flashPointC ?? null,
        ignitionTempC: s.physical.ignitionTempC ?? null,
        lelVolPct: s.physical.lelVolPct ?? null,
        uelVolPct: s.physical.uelVolPct ?? null,
        densityGCm3: s.physical.densityGCm3 ?? null,
        ionizationEv: s.physical.ionizationEv ?? null,
      },
      update: {
        boilingPointC: s.physical.boilingPointC ?? null,
        meltingPointC: s.physical.meltingPointC ?? null,
        flashPointC: s.physical.flashPointC ?? null,
        ignitionTempC: s.physical.ignitionTempC ?? null,
        lelVolPct: s.physical.lelVolPct ?? null,
        uelVolPct: s.physical.uelVolPct ?? null,
        densityGCm3: s.physical.densityGCm3 ?? null,
        ionizationEv: s.physical.ionizationEv ?? null,
      },
    });
  }

  return substance.id;
}

async function refreshPPE(substanceId: number): Promise<void> {
  const s = await prisma.substance.findUnique({
    where: { id: substanceId },
    include: {
      ghsPictograms: true,
      physicalProps: true,
      exposureLimits: { where: { limitType: "IDLH" } },
    },
  });
  if (!s) return;
  const categories = recommendPPECategories({
    ghsPictograms: s.ghsPictograms.map((g) => g.pictogramCode),
    boilingPointC: s.physicalProps?.boilingPointC ?? null,
    lelVolPct: s.physicalProps?.lelVolPct ?? null,
    idlhPpm: s.exposureLimits[0]?.valuePpm ?? null,
  });
  await prisma.substance.update({
    where: { id: substanceId },
    data: { ppeCategories: categories },
  });
}

async function main() {
  const all = mergedSeed();
  const sliced = ONLY > 0 ? all.slice(0, ONLY) : all;
  const list = FROM > 0 ? sliced.slice(FROM) : sliced;
  console.log(
    `Seeding ${list.length} substances${FROM > 0 ? ` (skipping first ${FROM})` : ""}…`
  );

  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    const label = `[${i + 1}/${list.length}] ${s.name}${s.casNumber ? ` (${s.casNumber})` : ""}`;
    try {
      const id = await upsertSubstance(s);
      if (!SKIP_ENRICH) {
        await enrichSubstance(id);
        await sleep(SUBSTANCE_DELAY_MS);
      }
      await refreshPPE(id);
      console.log(`✔ ${label}`);
    } catch (err) {
      console.error(`✘ ${label}:`, err instanceof Error ? err.message : err);
    }
  }

  const [count, picCount, hCount] = await Promise.all([
    prisma.substance.count(),
    prisma.substanceGHS.count(),
    prisma.substanceHStatement.count(),
  ]);
  console.log(`\nDone. ${count} substances, ${picCount} pictograms, ${hCount} H-statement links.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
