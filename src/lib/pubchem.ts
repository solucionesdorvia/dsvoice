import { cache, CACHE_TTL_24H } from "./cache";

// PubChem REST clients. All responses are cached in Redis for 24h under
// `pubchem:{cid|query}:{endpoint}` keys. PubChem rate limit: 5 req/sec.
// Consumers that do bulk work (seed scripts) should still throttle themselves.

const BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";
const VIEW = "https://pubchem.ncbi.nlm.nih.gov/rest/pug_view";
const AUTOCOMPLETE = "https://pubchem.ncbi.nlm.nih.gov/rest/autocomplete";

async function cachedFetchJson<T>(key: string, url: string): Promise<T | null> {
  const cached = await cache.get<T>(key);
  if (cached !== null) return cached;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      // 404 means "no data" — cache a short negative result so we don't hammer it
      if (res.status === 404) {
        await cache.set(key, null, 3600);
      }
      return null;
    }
    const json = (await res.json()) as T;
    await cache.set(key, json, CACHE_TTL_24H);
    return json;
  } catch (err) {
    console.warn(`[pubchem] fetch failed for ${url}`, err);
    return null;
  }
}

export async function getCID(casOrName: string): Promise<number | null> {
  const q = encodeURIComponent(casOrName);
  const data = await cachedFetchJson<{
    IdentifierList?: { CID?: number[] };
  }>(`pubchem:q:${casOrName.toLowerCase()}:cid`, `${BASE}/compound/name/${q}/cids/JSON`);
  return data?.IdentifierList?.CID?.[0] ?? null;
}

export type PubchemProperties = {
  CID: number;
  MolecularFormula?: string;
  MolecularWeight?: string;
  IUPACName?: string;
  XLogP?: number;
  ExactMass?: string;
  TPSA?: number;
  HBondDonorCount?: number;
  HBondAcceptorCount?: number;
  RotatableBondCount?: number;
};

export async function getProperties(cid: number): Promise<PubchemProperties | null> {
  const props =
    "MolecularFormula,MolecularWeight,IUPACName,XLogP,ExactMass,TPSA,HBondDonorCount,HBondAcceptorCount,RotatableBondCount";
  const data = await cachedFetchJson<{
    PropertyTable?: { Properties?: PubchemProperties[] };
  }>(`pubchem:${cid}:properties`, `${BASE}/compound/cid/${cid}/property/${props}/JSON`);
  return data?.PropertyTable?.Properties?.[0] ?? null;
}

export async function getSynonyms(cid: number): Promise<string[]> {
  const data = await cachedFetchJson<{
    InformationList?: { Information?: Array<{ Synonym?: string[] }> };
  }>(`pubchem:${cid}:synonyms`, `${BASE}/compound/cid/${cid}/synonyms/JSON`);
  return data?.InformationList?.Information?.[0]?.Synonym?.slice(0, 40) ?? [];
}

// The PUG-View GHS payload is deeply nested. We keep it as `unknown` here and
// let the parser in lib/ghs-parser.ts handle extraction.
export async function getGHSView(cid: number): Promise<unknown | null> {
  return cachedFetchJson<unknown>(
    `pubchem:${cid}:ghs`,
    `${VIEW}/data/compound/${cid}/JSON?heading=GHS+Classification`
  );
}

export async function autocomplete(query: string): Promise<string[]> {
  if (!query.trim()) return [];
  const q = encodeURIComponent(query);
  const data = await cachedFetchJson<{ dictionary_terms?: { compound?: string[] } }>(
    `pubchem:ac:${query.toLowerCase()}`,
    `${AUTOCOMPLETE}/compound/${q}/JSON?limit=10`
  );
  return data?.dictionary_terms?.compound ?? [];
}

// Extract CAS number from a list of PubChem synonyms. CAS numbers follow the
// pattern N-NN-N (2-7 digits - 2 digits - 1 digit).
const CAS_RE = /^\d{2,7}-\d{2}-\d$/;
export function extractCasFromSynonyms(synonyms: string[]): string | null {
  for (const s of synonyms) {
    if (CAS_RE.test(s)) return s;
  }
  return null;
}
