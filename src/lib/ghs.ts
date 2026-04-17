// GHS pictogram metadata used by the UI. SVG assets are served directly from
// PubChem's CDN, so we never need to bundle them.

export const GHS_PICTOGRAMS: Record<
  string,
  { name: string; description: string; url: string }
> = {
  GHS01: {
    name: "Explosivo",
    description: "Explosivos inestables, sustancias autorreactivas",
    url: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS01.svg",
  },
  GHS02: {
    name: "Inflamable",
    description: "Gases, líquidos, sólidos y aerosoles inflamables",
    url: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS02.svg",
  },
  GHS03: {
    name: "Comburente",
    description: "Gases, líquidos y sólidos comburentes",
    url: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS03.svg",
  },
  GHS04: {
    name: "Gas a presión",
    description: "Gases bajo presión",
    url: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS04.svg",
  },
  GHS05: {
    name: "Corrosivo",
    description: "Corrosivo para metales, corrosión cutánea, lesiones oculares",
    url: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS05.svg",
  },
  GHS06: {
    name: "Toxicidad aguda",
    description: "Toxicidad aguda (mortal/tóxico)",
    url: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS06.svg",
  },
  GHS07: {
    name: "Peligro para la salud (irritante)",
    description: "Irritación, sensibilización, toxicidad aguda (nocivo)",
    url: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS07.svg",
  },
  GHS08: {
    name: "Peligro para la salud",
    description:
      "Cancerígeno, mutágeno, tóxico para la reproducción, sensibilizante respiratorio",
    url: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS08.svg",
  },
  GHS09: {
    name: "Peligro para el medio ambiente",
    description: "Peligroso para el medio ambiente acuático",
    url: "https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS09.svg",
  },
};

export const GHS_CODES = Object.keys(GHS_PICTOGRAMS);
