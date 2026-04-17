import { prisma } from "./prisma";
import {
  getCID,
  getGHSView,
  getProperties,
  getSynonyms,
  extractCasFromSynonyms,
} from "./pubchem";
import { parseGHS } from "./ghs-parser";
import { H_STATEMENTS, P_STATEMENTS, resolveStatement } from "./statements";
import { recommendPPECategories } from "./ppe";

// Enrich a substance from PubChem and upsert all related records.
// Safe to call many times — operations are idempotent.
export async function enrichSubstance(substanceId: number): Promise<void> {
  const substance = await prisma.substance.findUnique({ where: { id: substanceId } });
  if (!substance) throw new Error(`substance ${substanceId} not found`);

  // 1. Resolve PubChem CID
  let cid = substance.pubchemCid ?? null;
  if (!cid) {
    const lookupKey = substance.casNumber ?? substance.name;
    if (lookupKey) cid = await getCID(lookupKey);
  }
  if (!cid) return; // Nothing more we can do

  // 2. Properties (formula, IUPAC name)
  const [props, synonyms, ghsView] = await Promise.all([
    getProperties(cid),
    getSynonyms(cid),
    getGHSView(cid),
  ]);

  // 3. Walk GHS payload for pictograms + H/P codes
  const ghs = parseGHS(ghsView);

  // 4. Derive CAS from synonyms if we don't have one
  const casFromSynonyms = extractCasFromSynonyms(synonyms);

  // 5. Compute PPE categories from the new pictogram list
  const ppeCategories = recommendPPECategories({
    ghsPictograms: ghs.pictograms,
    boilingPointC: null,
    lelVolPct: null,
    idlhPpm: null,
  });

  // 6. Upsert substance core fields
  await prisma.substance.update({
    where: { id: substanceId },
    data: {
      pubchemCid: cid,
      formula: substance.formula ?? props?.MolecularFormula ?? null,
      casNumber: substance.casNumber ?? casFromSynonyms ?? null,
      ppeCategories,
    },
  });

  // 7. Replace GHS pictograms
  await prisma.substanceGHS.deleteMany({ where: { substanceId } });
  if (ghs.pictograms.length > 0) {
    await prisma.substanceGHS.createMany({
      data: ghs.pictograms.map((code) => ({ substanceId, pictogramCode: code })),
      skipDuplicates: true,
    });
  }

  // 8. Upsert H statements (dictionary rows first, then join rows)
  await upsertStatements(ghs.hCodes, "H");
  await prisma.substanceHStatement.deleteMany({ where: { substanceId } });
  if (ghs.hCodes.length > 0) {
    await prisma.substanceHStatement.createMany({
      data: ghs.hCodes.map((hCode) => ({ substanceId, hCode })),
      skipDuplicates: true,
    });
  }

  // 9. Upsert P statements
  await upsertStatements(ghs.pCodes, "P");
  await prisma.substancePStatement.deleteMany({ where: { substanceId } });
  if (ghs.pCodes.length > 0) {
    await prisma.substancePStatement.createMany({
      data: ghs.pCodes.map((pCode) => ({ substanceId, pCode })),
      skipDuplicates: true,
    });
  }

  // 10. Synonyms
  if (synonyms.length > 0) {
    await prisma.substanceSynonym.deleteMany({ where: { substanceId } });
    // Distinct + skip the substance's own name to avoid duplicates in the list
    const unique = Array.from(
      new Set(synonyms.filter((s) => s.toLowerCase() !== substance.name.toLowerCase()))
    ).slice(0, 40);
    if (unique.length > 0) {
      await prisma.substanceSynonym.createMany({
        data: unique.map((synonym) => ({ substanceId, synonym })),
      });
    }
  }
}

async function upsertStatements(codes: string[], kind: "H" | "P"): Promise<void> {
  const dict = kind === "H" ? H_STATEMENTS : P_STATEMENTS;
  const model = kind === "H" ? prisma.hStatement : prisma.pStatement;

  await Promise.all(
    codes.map((code) =>
      // @ts-expect-error — narrow union union over the two dictionary models
      model.upsert({
        where: { code },
        create: { code, textEn: resolveStatement(code, dict) },
        update: {},
      })
    )
  );
}
