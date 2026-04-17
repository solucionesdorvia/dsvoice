// Walks the PubChem PUG-View GHS Classification payload and extracts:
//   - pictogram codes (GHS01..GHS09)
//   - H-statement codes (H200..H410, plus combined codes like H301+H311+H331)
//   - P-statement codes (P101..P501, plus combined codes like P301+P310)
// The payload is deeply nested and varies between compounds, so we recursively
// collect any string value we can match with our regexes.

export type GHSExtracted = {
  pictograms: string[];
  hCodes: string[];
  pCodes: string[];
};

const PICTOGRAM_RE = /\bGHS0[1-9]\b/g;
const H_CODE_RE = /\bH\d{3}(?:\+H?\d{3})*(?:\+H?\d{3})?\b/g;
const P_CODE_RE = /\bP\d{3}(?:\+P?\d{3})*(?:\+P?\d{3})?\b/g;

function collectStrings(node: unknown, acc: string[]): void {
  if (node === null || node === undefined) return;
  if (typeof node === "string") {
    acc.push(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) collectStrings(item, acc);
    return;
  }
  if (typeof node === "object") {
    for (const v of Object.values(node as Record<string, unknown>)) {
      collectStrings(v, acc);
    }
  }
}

export function parseGHS(view: unknown): GHSExtracted {
  const strings: string[] = [];
  collectStrings(view, strings);
  const joined = strings.join("\n");

  const pictograms = Array.from(new Set(joined.match(PICTOGRAM_RE) ?? []));

  // Normalize combined H-codes so e.g. "H301+311+331" becomes "H301+H311+H331"
  const rawH = joined.match(H_CODE_RE) ?? [];
  const hCodes = Array.from(
    new Set(rawH.map((c) => normalizeCombinedCode(c, "H")))
  );

  const rawP = joined.match(P_CODE_RE) ?? [];
  const pCodes = Array.from(
    new Set(rawP.map((c) => normalizeCombinedCode(c, "P")))
  );

  return { pictograms, hCodes, pCodes };
}

function normalizeCombinedCode(code: string, prefix: "H" | "P"): string {
  if (!code.includes("+")) return code;
  const parts = code.split("+").map((part, i) => {
    const trimmed = part.trim();
    if (i === 0) return trimmed;
    return trimmed.startsWith(prefix) ? trimmed : `${prefix}${trimmed}`;
  });
  return parts.join("+");
}
