// Catálogo de productos de referencia para detección y EPI.
// Los modelos citados (X-am, Polytron, X-plore, CPS, PSS, Saver…) son
// referencias industriales reales ampliamente documentadas.

import type { PPECategoryKey } from "./ppe";

export type ProductCard = {
  id: string;
  category: PPECategoryKey;
  name: string;
  features: string[];
  href: string;
};

export const PRODUCTS: ProductCard[] = [
  // ——— Sensores y detectores portátiles de gas ———
  {
    id: "x-am-5000",
    category: "portable_detectors",
    name: "X-am® 5000",
    features: [
      "Equipo de detección de 1 a 5 gases",
      "Monitorización personal del aire",
      "Detecta gases y vapores combustibles y O₂, CO, H₂S, NO₂ y SO₂",
    ],
    href: "#",
  },
  {
    id: "x-am-8000",
    category: "portable_detectors",
    name: "X-am 8000",
    features: [
      "Dispositivo de detección de 1 a 7 gases",
      "Para la medición de supervisión y control de gases",
      "Detección de gases tóxicos así como gases y vapores combustibles y oxígeno",
    ],
    href: "#",
  },
  {
    id: "x-am-3500",
    category: "portable_detectors",
    name: "X-am® 3500",
    features: [
      "Equipo de detección de 1 a 4 gases",
      "Para medición del control de gases",
      "Detección de gases y vapores inflamables y de O₂, CO, H₂S, NO₂ y SO₂",
    ],
    href: "#",
  },
  {
    id: "x-pid-9500",
    category: "portable_detectors",
    name: "X-pid 9500/9500+",
    features: [
      "Detección selectiva de gases COV",
      "Pruebas frecuentes de sustancias tóxicas y cancerígenas",
      "Resultados tipo laboratorio en concentraciones muy bajas",
      "Mide benceno a partir de 50 ppb",
    ],
    href: "#",
  },
  {
    id: "x-am-5600",
    category: "portable_detectors",
    name: "X-am 5600",
    features: [
      "Equipo de detección de 1 a 6 gases",
      "Monitorización personal del aire",
      "Mediciones fiables de gases y vapores explosivos, combustibles y tóxicos, y de oxígeno",
    ],
    href: "#",
  },
  {
    id: "x-am-2800",
    category: "portable_detectors",
    name: "X-am 2800",
    features: [
      "Equipo de detección de 1 a 4 gases",
      "Monitorización personal del aire",
      "Detección de gases y vapores inflamables y de O₂, CO, NO₂, SO₂ y H₂S",
      "Monitorización en tiempo real con Gas Detection Connect",
    ],
    href: "#",
  },
  {
    id: "x-am-5800",
    category: "portable_detectors",
    name: "X-am® 5800",
    features: [
      "Equipo de detección de 1 a 6 gases",
      "Monitorización personal del aire",
      "Detección de gases/vapores inflamables, gases tóxicos y oxígeno",
      "Componente del sistema Gas Detection Connect",
    ],
    href: "#",
  },
  {
    id: "x-am-2600",
    category: "portable_detectors",
    name: "X-am 2600",
    features: [
      "Dispositivo de detección de 1 a 4 gases",
      "Compatible con Gas Detection Connect",
      "Monitorización en tiempo real",
      "Diseño robusto con clasificación IP68",
    ],
    href: "#",
  },
  {
    id: "catex-sensors",
    category: "portable_detectors",
    name: "Sensores catalíticos Cat Ex",
    features: [
      "Monitorización de mezclas explosivas",
      "Alta resistencia a la contaminación por siliconas y H₂S",
      "Compatible con familia X-am",
      "Rango de medición: LIE hasta 100 % vol.",
    ],
    href: "#",
  },
  {
    id: "pid-sensors",
    category: "portable_detectors",
    name: "Sensores PID",
    features: [
      "Detección de compuestos orgánicos volátiles en bajas concentraciones",
      "Compatible con X-am 7000 y X-am 8000",
      "Rango de medición en ppm y ppb",
    ],
    href: "#",
  },
  {
    id: "ir-sensors",
    category: "portable_detectors",
    name: "Sensores infrarrojos",
    features: [
      "Monitorización de mezclas explosivas y CO₂",
      "Recomendado para gases explosivos frecuentes",
      "Compatible con X-am 5600/7000/8000",
      "Rango: LIE hasta 100 % vol., CO₂ 0-5 % vol.",
    ],
    href: "#",
  },

  // ——— Tubos colorimétricos ———
  {
    id: "tubes-short-term",
    category: "colorimetric_tubes",
    name: "Tubos colorimétricos de rango corto",
    features: [
      "Método fiable para la medición de gases",
      "Más de 500 gases diferentes detectables",
      "Resultados al final del proceso de medición",
      "Tiempo de medición: de 5 s a 15 min",
    ],
    href: "#",
  },
  {
    id: "tubes-sampling",
    category: "colorimetric_tubes",
    name: "Tubos y sistemas de muestreo",
    features: [
      "Análisis de muestras en laboratorio",
      "Fiable incluso con compuestos complejos y mezclas",
      "Posibilidad de detección de bajas concentraciones",
    ],
    href: "#",
  },
  {
    id: "x-act-7000",
    category: "colorimetric_tubes",
    name: "X-act® 7000",
    features: [
      "Mediciones con tubos de corta duración",
      "Sistema optoelectrónico para detección selectiva",
      "Medición de calidad profesional en el rango de ppb",
    ],
    href: "#",
  },
  {
    id: "accuro",
    category: "colorimetric_tubes",
    name: "Bomba manual accuro",
    features: [
      "Mediciones puntuales con número limitado de emboladas",
      "Contador integrado de emboladas",
      "Fácil de manejar con una mano",
      "Apto para áreas explosivas",
    ],
    href: "#",
  },

  // ——— Detectores fijos ———
  {
    id: "polytron-se-ex",
    category: "fixed_detectors",
    name: "Polytron SE Ex",
    features: [
      "Monitorización continua de gases y vapores inflamables",
      "Principio del calor de reacción",
      "Apto para entornos industriales exigentes",
    ],
    href: "#",
  },
  {
    id: "pex-3000",
    category: "fixed_detectors",
    name: "PEX 3000",
    features: [
      "Transmisor para monitorización continua de inflamables",
      "Óptica sin desviación y diseño robusto",
      "Apto para los entornos industriales más hostiles",
    ],
    href: "#",
  },
  {
    id: "polytron-5200-cat",
    category: "fixed_detectors",
    name: "Polytron 5200 CAT",
    features: [
      "Transmisor económico a prueba de explosiones",
      "Sensor Ex de perlas catalíticas",
      "Compatible con sistemas mediante salida analógica 4–20 mA de 3 hilos",
    ],
    href: "#",
  },
  {
    id: "polytron-8200-cat",
    category: "fixed_detectors",
    name: "Polytron 8200 CAT",
    features: [
      "Transmisor avanzado a prueba de explosiones",
      "Sensor Ex de perlas catalíticas",
      "Detecta la mayoría de gases y vapores inflamables",
    ],
    href: "#",
  },
  {
    id: "polytron-8700-ir",
    category: "fixed_detectors",
    name: "Polytron 8700 IR",
    features: [
      "Transmisor avanzado a prueba de explosiones",
      "Sensor PIR 7000 por infrarrojos de alto rendimiento",
      "Detecta hidrocarburos más comunes",
    ],
    href: "#",
  },
  {
    id: "polytron-5310-ir",
    category: "fixed_detectors",
    name: "Polytron® 5310 IR",
    features: [
      "Monitoriza gases inflamables en el LIE",
      "Sensor IR por infrarrojos",
      "Configurable para metano, propano o etileno",
    ],
    href: "#",
  },
  {
    id: "polytron-8310-ir",
    category: "fixed_detectors",
    name: "Polytron® 8310 IR",
    features: [
      "Transmisor avanzado a prueba de explosiones",
      "Sensor IR de alto rendimiento",
      "Detecta los hidrocarburos más comunes",
    ],
    href: "#",
  },
  {
    id: "pir-3000",
    category: "fixed_detectors",
    name: "PIR 3000",
    features: [
      "Detector IR a prueba de explosiones",
      "Monitorización continua de gases inflamables",
      "Apto para los entornos industriales más hostiles",
    ],
    href: "#",
  },
  {
    id: "pir-7000",
    category: "fixed_detectors",
    name: "PIR 7000",
    features: [
      "Detector IR a prueba de explosiones",
      "Monitorización continua de gases inflamables",
      "Óptica sin desviación y diseño robusto",
    ],
    href: "#",
  },
  {
    id: "cat-ex-bead",
    category: "fixed_detectors",
    name: "DrägerSensor perlas catalíticas",
    features: [
      "Detecta gases y vapores inflamables",
      "Estabilidad duradera por método de doble detector",
    ],
    href: "#",
  },
  {
    id: "ir-fixed-sensor",
    category: "fixed_detectors",
    name: "DrägerSensor IR",
    features: [
      "Monitorización de inflamables y CO₂",
      "Puede reemplazar sensores Ex catalíticos",
      "Sensores robustos y de larga duración",
    ],
    href: "#",
  },

  // ——— Máscaras y filtros ———
  {
    id: "x-plore-rd40",
    category: "masks_and_filters",
    name: "X-plore® Rd40",
    features: [
      "Filtros con conexión estándar Rd40 (EN 148-1)",
      "Carcasa de aluminio robusta",
      "Para máscaras completas y semicaretas",
    ],
    href: "#",
  },
  {
    id: "x-plore-bayonet",
    category: "masks_and_filters",
    name: "X-plore® bayoneta",
    features: [
      "Filtros con conexión de bayoneta",
      "Cierre rápido y seguro",
      "Compatible con semicaretas X-plore® 3000",
    ],
    href: "#",
  },
  {
    id: "x-plore-4700",
    category: "masks_and_filters",
    name: "X-plore® 4700",
    features: [
      "Semicareta de filtro único con conexión Rd40 (EN 148-1)",
      "Apta para diferentes industrias",
      "Amplia gama de filtros Rd40",
    ],
    href: "#",
  },
  {
    id: "panorama-nova",
    category: "masks_and_filters",
    name: "Panorama Nova®",
    features: [
      "Máscara completa que protege vías respiratorias y ojos",
      "Diferentes conexiones de rosca (RA/PE/ESA/P)",
      "Cuerpo de EPDM o silicona",
    ],
    href: "#",
  },
  {
    id: "x-plore-6530",
    category: "masks_and_filters",
    name: "X-plore® 6530",
    features: [
      "Máscara completa de alta calidad con filtro único",
      "Conexión estándar Rd40",
      "Amplia gama de filtros para diferentes aplicaciones",
    ],
    href: "#",
  },
  {
    id: "x-plore-6300",
    category: "masks_and_filters",
    name: "X-plore® 6300",
    features: [
      "Máscara completa económica con filtro único",
      "Rosca estándar Rd40",
      "Para entornos que requieren mayor protección",
    ],
    href: "#",
  },
  {
    id: "x-plore-5500",
    category: "masks_and_filters",
    name: "X-plore® 5500",
    features: [
      "Máscara completa con doble filtro de bayoneta",
      "Para mayor protección respiratoria y ocular",
      "Amplia gama de filtros de bayoneta",
    ],
    href: "#",
  },
  {
    id: "x-plore-3300",
    category: "masks_and_filters",
    name: "X-plore 3300/3500",
    features: [
      "Semicareta de doble filtro con conexión de bayoneta",
      "Material Soft-TPE o DrägerFlex hipoalergénico",
      "Amplia gama de filtros disponibles",
    ],
    href: "#",
  },

  // ——— Trajes de protección química ———
  {
    id: "cps-5800",
    category: "suits",
    name: "CPS 5800",
    features: [
      "Traje de uso limitado para aplicaciones industriales",
      "Protege frente a sustancias gaseosas, líquidas y sólidas",
      "Uso con ERA sobre el traje",
    ],
    href: "#",
  },
  {
    id: "cps-7900",
    category: "suits",
    name: "CPS 7900",
    features: [
      "Traje reutilizable hermético a gases",
      "Resistente a productos químicos industriales y agentes biológicos",
      "Apto para áreas explosivas y sustancias criogénicas",
      "ERA para uso dentro del traje",
    ],
    href: "#",
  },
  {
    id: "cps-7800",
    category: "suits",
    name: "CPS 7800",
    features: [
      "Traje reutilizable hermético a gases",
      "Protege frente a gases, líquidos, aerosoles y sólidos",
      "Apto para áreas explosivas",
      "ERA para uso sobre el traje",
    ],
    href: "#",
  },
  {
    id: "cps-5900",
    category: "suits",
    name: "CPS 5900",
    features: [
      "Traje desechable hermético a gases",
      "Resistente a productos químicos y amenazas biológicas",
      "ERA dentro del traje",
    ],
    href: "#",
  },
  {
    id: "spc-4700",
    category: "suits",
    name: "SPC 4700 con CVA 0700",
    features: [
      "Traje ventilado de protección contra salpicaduras",
      "Aire respirable y flujo de refrigeración (tipo 3)",
      "Para uso en áreas explosivas",
    ],
    href: "#",
  },

  // ——— Independiente del aire ambiente ———
  {
    id: "pas-x-plore",
    category: "air_independent",
    name: "X-plore 9x00 / PAS X-plore",
    features: [
      "Aplicaciones industriales ligeras",
      "Protección cómoda y fiable, sin resistencia",
      "Compatible con elementos de protección de cabeza",
    ],
    href: "#",
  },
  {
    id: "pas-colt",
    category: "air_independent",
    name: "PAS Colt",
    features: [
      "Unidad de evacuación de corta duración",
      "Montaje en cadera",
      "Ideal para espacios reducidos",
    ],
    href: "#",
  },
  {
    id: "pas-micro",
    category: "air_independent",
    name: "PAS® Micro",
    features: [
      "Unidad de evacuación de emergencia",
      "Ajuste ergonómico",
      "Resistente al calor y fuego (EN 137)",
    ],
    href: "#",
  },
  {
    id: "pas-lite",
    category: "air_independent",
    name: "PAS Lite",
    features: [
      "ERA sencillo y robusto para aplicaciones industriales",
      "Adaptable a otras aplicaciones específicas",
      "Compatible con máscaras Panorama Nova y FPS 7000",
    ],
    href: "#",
  },
  {
    id: "pss-3000",
    category: "air_independent",
    name: "PSS® 3000",
    features: [
      "ERA para aplicaciones básicas en industria y contra incendios",
      "Comodidad con rendimiento neumático excepcional",
    ],
    href: "#",
  },
  {
    id: "pss-7000",
    category: "air_independent",
    name: "PSS® 7000",
    features: [
      "ERA de alto rendimiento",
      "Sistema de transporte ergonómico",
      "Compatible con HUD y telemetría",
    ],
    href: "#",
  },
  {
    id: "pss-airboss",
    category: "air_independent",
    name: "PSS AirBoss",
    features: [
      "ERA de alto rendimiento para extinción de incendios",
      "Ergonomía destacada, uno de los equipos más ligeros",
      "Compatible con FireGround",
    ],
    href: "#",
  },
  {
    id: "saver-pp",
    category: "air_independent",
    name: "Saver PP",
    features: [
      "Equipo respiratorio de presión positiva para evacuación",
      "Funcionamiento automático",
      "Hasta 15 minutos de aire salvavidas",
    ],
    href: "#",
  },
  {
    id: "saver-cf",
    category: "air_independent",
    name: "Saver CF",
    features: [
      "Equipo de flujo constante con capucha para evacuación",
      "Funcionamiento automático",
      "Hasta 15 minutos de aire salvavidas",
    ],
    href: "#",
  },
];

export function productsForCategory(cat: PPECategoryKey): ProductCard[] {
  return PRODUCTS.filter((p) => p.category === cat);
}
