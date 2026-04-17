// Capa de traducción de nombres de sustancia (EN → ES).
// PubChem nos devuelve los nombres en inglés; aquí tradumos los más comunes
// para mostrarlos en la UI. Si no hay traducción, se muestra el nombre en inglés.

const NAME_ES: Record<string, string> = {
  Acetone: "Acetona",
  Ammonia: "Amoníaco",
  Benzene: "Benceno",
  Toluene: "Tolueno",
  Methanol: "Metanol",
  Ethanol: "Etanol",
  Chlorine: "Cloro",
  "Carbon monoxide": "Monóxido de carbono",
  "Carbon dioxide": "Dióxido de carbono",
  "Hydrogen sulfide": "Sulfuro de hidrógeno",
  "Hydrogen chloride": "Cloruro de hidrógeno",
  "Hydrogen cyanide": "Cianuro de hidrógeno",
  "Hydrogen fluoride": "Fluoruro de hidrógeno",
  "Sulfur dioxide": "Dióxido de azufre",
  "Sulfuric acid": "Ácido sulfúrico",
  "Nitric acid": "Ácido nítrico",
  "Hydrochloric acid": "Ácido clorhídrico",
  "Acetic acid": "Ácido acético",
  "Formic acid": "Ácido fórmico",
  "Nitrogen dioxide": "Dióxido de nitrógeno",
  "Nitric oxide": "Óxido nítrico",
  "Nitrous oxide": "Óxido nitroso",
  Ozone: "Ozono",
  Oxygen: "Oxígeno",
  Hydrogen: "Hidrógeno",
  Nitrogen: "Nitrógeno",
  Methane: "Metano",
  Ethane: "Etano",
  Propane: "Propano",
  Butane: "Butano",
  Pentane: "Pentano",
  Hexane: "Hexano",
  Heptane: "Heptano",
  Octane: "Octano",
  Ethylene: "Etileno",
  Propylene: "Propileno",
  Acetylene: "Acetileno",
  Styrene: "Estireno",
  Xylene: "Xileno",
  Phenol: "Fenol",
  Formaldehyde: "Formaldehído",
  Acetaldehyde: "Acetaldehído",
  Chloroform: "Cloroformo",
  "Methyl ethyl ketone": "Metiletilcetona",
  Pyridine: "Piridina",
  Aniline: "Anilina",
  Ethylbenzene: "Etilbenceno",
  "Vinyl chloride": "Cloruro de vinilo",
  "Methylene chloride": "Cloruro de metileno",
  Dichloromethane: "Diclorometano",
  Trichloroethylene: "Tricloroetileno",
  Tetrachloroethylene: "Tetracloroetileno",
  "Carbon tetrachloride": "Tetracloruro de carbono",
  "1,3-Butadiene": "1,3-Butadieno",
  "Ethylene oxide": "Óxido de etileno",
  "Propylene oxide": "Óxido de propileno",
  "Methyl isocyanate": "Isocianato de metilo",
  Phosgene: "Fosgeno",
  Arsine: "Arsina",
  Phosphine: "Fosfina",
  "Hydrogen peroxide": "Peróxido de hidrógeno",
  "Sodium hydroxide": "Hidróxido de sodio",
  "Potassium hydroxide": "Hidróxido de potasio",
  "Calcium hydroxide": "Hidróxido de calcio",
  "Sodium hypochlorite": "Hipoclorito de sodio",
  "Ammonium hydroxide": "Hidróxido de amonio",
  Mercury: "Mercurio",
  Lead: "Plomo",
  Cadmium: "Cadmio",
  Nickel: "Níquel",
  Chromium: "Cromo",
  Manganese: "Manganeso",
  Copper: "Cobre",
  Zinc: "Zinc",
  Aluminum: "Aluminio",
  Iron: "Hierro",
  Silicon: "Silicio",
  Isopropanol: "Isopropanol",
  "2-Propanol": "Isopropanol",
  "1-Butanol": "1-Butanol",
  Glycerol: "Glicerol",
  "Ethylene glycol": "Etilenglicol",
  "Diethyl ether": "Éter dietílico",
  "Ethyl acetate": "Acetato de etilo",
  "Methyl acetate": "Acetato de metilo",
  Cyclohexane: "Ciclohexano",
  Naphthalene: "Naftaleno",
  "Carbon disulfide": "Disulfuro de carbono",
  Furfural: "Furfural",
  Mesitylene: "Mesitileno",
  "tert-Butanol": "Alcohol terc-butílico",
  "Diethylene glycol": "Dietilenglicol",
  "Tetrahydrofuran": "Tetrahidrofurano",
  "N,N-Dimethylformamide": "N,N-Dimetilformamida",
  "Dimethyl sulfoxide": "Dimetilsulfóxido",
  Acrylonitrile: "Acrilonitrilo",
  Acrylamide: "Acrilamida",
  Epichlorohydrin: "Epiclorhidrina",
};

// Normalizador: minúsculas, sin acentos, trim.
function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// EN → ES (por nombre normalizado)
const NAME_ES_NORMALIZED = new Map<string, string>();
// ES (normalizado) → EN (por si el usuario busca en español)
const ES_TO_EN = new Map<string, string>();

for (const [en, es] of Object.entries(NAME_ES)) {
  NAME_ES_NORMALIZED.set(normalize(en), es);
  ES_TO_EN.set(normalize(es), en);
}

export function translateSubstanceName(name: string): string {
  return NAME_ES_NORMALIZED.get(normalize(name)) ?? name;
}

/**
 * Devuelve la lista de términos a buscar en la BD dada una consulta del
 * usuario. Incluye siempre la consulta original y:
 *  - Si coincide con un nombre conocido en español, su equivalente en inglés.
 *  - Una "raíz" de la traducción inglesa si ésta termina en "e" y tiene más
 *    de 5 letras, para capturar derivados ("Acetone" → "Aceton" matchea
 *    "acetonitrile", "acetonide", etc.).
 *  - Para "acetona" en concreto, la raíz española "aceton" también se añade
 *    para capturar sinónimos en español como "acetonuria", "acetonemia"…
 */
export function searchTerms(query: string): string[] {
  const q = query.trim();
  if (!q) return [];
  const terms = new Set<string>([q]);

  const en = ES_TO_EN.get(normalize(q));
  if (en) {
    terms.add(en);
    if (en.length > 5 && en.toLowerCase().endsWith("e")) {
      terms.add(en.slice(0, -1));
    }
  }

  // Raíz del propio término en español si termina en vocal (a/o/e)
  if (q.length > 5 && /[aeo]$/i.test(q)) {
    terms.add(q.slice(0, -1));
  }

  return Array.from(terms);
}
