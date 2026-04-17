// Categorías de producto siguiendo la taxonomía real de Dräger VOICE.
// Derivadas del perfil de peligro de la sustancia (GHS + propiedades físicas).

export type PPEInput = {
  ghsPictograms: string[];
  boilingPointC?: number | null;
  lelVolPct?: number | null;
  idlhPpm?: number | null;
};

export const PPE_CATEGORIES = {
  portable_detectors: "Sensores y detectores de gases",
  colorimetric_tubes: "Tubos colorimétricos",
  fixed_detectors: "Detectores fijos de gases y sensores",
  masks_and_filters: "Máscaras & Filtros",
  suits: "Trajes",
  air_independent: "Independiente del aire ambiente",
} as const;

export type PPECategoryKey = keyof typeof PPE_CATEGORIES;

// Orden canónico en el que aparecen las pestañas en Dräger VOICE.
export const PPE_CATEGORY_ORDER: PPECategoryKey[] = [
  "portable_detectors",
  "colorimetric_tubes",
  "fixed_detectors",
  "masks_and_filters",
  "suits",
  "air_independent",
];

export function recommendPPECategories(substance: PPEInput): PPECategoryKey[] {
  const cats = new Set<PPECategoryKey>();
  const { ghsPictograms, boilingPointC, lelVolPct, idlhPpm } = substance;

  const bp = boilingPointC ?? undefined;
  const isFlammable =
    ghsPictograms.includes("GHS02") ||
    (lelVolPct !== null && lelVolPct !== undefined);
  const isGasOrVapor =
    (bp !== undefined && bp < 150) || lelVolPct !== null;
  const isCorrosive = ghsPictograms.includes("GHS05");
  const isToxic =
    ghsPictograms.includes("GHS06") || ghsPictograms.includes("GHS08");
  const isIrritant = ghsPictograms.includes("GHS07");
  const isGas = ghsPictograms.includes("GHS04") || (bp !== undefined && bp < 0);

  // Detectores portátiles: se usan prácticamente siempre
  cats.add("portable_detectors");

  // Tubos colorimétricos: gases y vapores reactivos
  if (isGasOrVapor || isToxic || isCorrosive || isIrritant) {
    cats.add("colorimetric_tubes");
  }

  // Detectores fijos: inflamables o emisiones continuas típicas
  if (isFlammable || isGas || isToxic) {
    cats.add("fixed_detectors");
  }

  // Máscaras y filtros: cualquier peligro por inhalación
  if (isToxic || isIrritant || isCorrosive) {
    cats.add("masks_and_filters");
  }

  // Trajes: contacto con sustancias corrosivas o sistémicamente peligrosas
  if (isCorrosive || (isToxic && ghsPictograms.includes("GHS08"))) {
    cats.add("suits");
  }

  // Independiente del aire ambiente (ERA / evacuación):
  // IPVS bajo, tóxico agudo o corrosivo.
  if (
    (idlhPpm !== null && idlhPpm !== undefined && idlhPpm < 500) ||
    isToxic ||
    isCorrosive ||
    ghsPictograms.includes("GHS06")
  ) {
    cats.add("air_independent");
  }

  return PPE_CATEGORY_ORDER.filter((k) => cats.has(k));
}
