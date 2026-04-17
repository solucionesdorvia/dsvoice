// Ilustraciones SVG inline para cada tipo de producto. Monocromo en
// color de marca (azul), sin fotografías reales (por derechos de imagen).

import type { PPECategoryKey } from "@/lib/ppe";

type Props = { className?: string };

export function ProductIllustration({
  category,
  productId,
  className,
}: {
  category: PPECategoryKey;
  productId?: string;
  className?: string;
}) {
  const Chosen =
    ILLUSTRATIONS[productId ?? ""] ?? CATEGORY_FALLBACK[category];
  return <Chosen className={className} />;
}

const strokeProps = {
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};

function PortableDetector({ className }: Props) {
  return (
    <svg viewBox="0 0 120 160" className={className} {...strokeProps}>
      <rect x="25" y="10" width="70" height="140" rx="8" />
      <rect x="35" y="25" width="50" height="45" rx="3" fill="currentColor" opacity="0.1" />
      <line x1="35" y1="40" x2="80" y2="40" />
      <line x1="35" y1="55" x2="65" y2="55" />
      <circle cx="45" cy="95" r="7" />
      <circle cx="75" cy="95" r="7" />
      <rect x="40" y="115" width="40" height="8" rx="2" />
      <rect x="40" y="130" width="40" height="8" rx="2" />
      <circle cx="60" cy="18" r="1.5" fill="currentColor" />
    </svg>
  );
}

function MultiGasDetector({ className }: Props) {
  return (
    <svg viewBox="0 0 120 160" className={className} {...strokeProps}>
      <rect x="20" y="20" width="80" height="120" rx="6" />
      <rect x="30" y="30" width="60" height="35" rx="2" fill="currentColor" opacity="0.1" />
      <text x="60" y="52" fontSize="10" fill="currentColor" textAnchor="middle" stroke="none">
        20.9
      </text>
      <rect x="30" y="75" width="26" height="12" rx="2" />
      <rect x="64" y="75" width="26" height="12" rx="2" />
      <rect x="30" y="92" width="26" height="12" rx="2" />
      <rect x="64" y="92" width="26" height="12" rx="2" />
      <circle cx="40" cy="122" r="5" />
      <circle cx="60" cy="122" r="5" fill="currentColor" />
      <circle cx="80" cy="122" r="5" />
    </svg>
  );
}

function PidDetector({ className }: Props) {
  return (
    <svg viewBox="0 0 140 160" className={className} {...strokeProps}>
      <rect x="15" y="15" width="110" height="130" rx="10" />
      <rect x="25" y="28" width="90" height="45" rx="3" fill="currentColor" opacity="0.1" />
      <path d="M30 55 L45 45 L60 52 L75 42 L95 50 L110 45" />
      <circle cx="50" cy="105" r="10" />
      <rect x="70" y="95" width="45" height="20" rx="3" />
      <rect x="25" y="125" width="90" height="12" rx="2" />
    </svg>
  );
}

function ColorimetricTube({ className }: Props) {
  return (
    <svg viewBox="0 0 200 120" className={className} {...strokeProps}>
      <rect x="20" y="40" width="160" height="40" rx="20" />
      <rect x="35" y="48" width="30" height="24" fill="currentColor" opacity="0.6" stroke="none" />
      <rect x="68" y="48" width="40" height="24" fill="currentColor" opacity="0.25" stroke="none" />
      <line x1="35" y1="50" x2="35" y2="70" />
      <line x1="55" y1="50" x2="55" y2="70" />
      <line x1="75" y1="50" x2="75" y2="70" />
      <line x1="95" y1="50" x2="95" y2="70" />
      <line x1="115" y1="50" x2="115" y2="70" />
      <line x1="135" y1="50" x2="135" y2="70" />
      <line x1="155" y1="50" x2="155" y2="70" />
      <circle cx="180" cy="60" r="6" />
    </svg>
  );
}

function HandPump({ className }: Props) {
  return (
    <svg viewBox="0 0 160 160" className={className} {...strokeProps}>
      <ellipse cx="80" cy="80" rx="45" ry="55" />
      <line x1="35" y1="80" x2="125" y2="80" />
      <rect x="55" y="60" width="50" height="40" rx="5" fill="currentColor" opacity="0.08" />
      <circle cx="80" cy="30" r="8" />
      <line x1="80" y1="38" x2="80" y2="60" />
    </svg>
  );
}

function FixedDetector({ className }: Props) {
  return (
    <svg viewBox="0 0 160 160" className={className} {...strokeProps}>
      <rect x="40" y="40" width="80" height="60" rx="6" />
      <circle cx="80" cy="70" r="18" />
      <circle cx="80" cy="70" r="9" fill="currentColor" opacity="0.2" />
      <rect x="55" y="100" width="50" height="30" rx="4" fill="currentColor" opacity="0.08" />
      <line x1="70" y1="115" x2="90" y2="115" />
      <line x1="70" y1="122" x2="90" y2="122" />
      <path d="M75 40 L75 25 L85 25 L85 40" />
    </svg>
  );
}

function IrDetector({ className }: Props) {
  return (
    <svg viewBox="0 0 160 160" className={className} {...strokeProps}>
      <rect x="20" y="50" width="120" height="60" rx="30" />
      <circle cx="50" cy="80" r="15" />
      <circle cx="50" cy="80" r="7" fill="currentColor" opacity="0.25" />
      <circle cx="110" cy="80" r="15" />
      <circle cx="110" cy="80" r="7" fill="currentColor" opacity="0.25" />
      <line x1="65" y1="80" x2="95" y2="80" strokeDasharray="3 3" />
    </svg>
  );
}

function HalfMask({ className }: Props) {
  return (
    <svg viewBox="0 0 180 140" className={className} {...strokeProps}>
      <path d="M30 50 Q90 20 150 50 Q155 90 130 105 Q90 115 50 105 Q25 90 30 50 Z" fill="currentColor" fillOpacity="0.04" />
      <circle cx="55" cy="75" r="18" fill="currentColor" opacity="0.15" />
      <circle cx="125" cy="75" r="18" fill="currentColor" opacity="0.15" />
      <circle cx="55" cy="75" r="10" />
      <circle cx="125" cy="75" r="10" />
      <path d="M80 85 Q90 95 100 85" />
      <path d="M30 50 L10 45" />
      <path d="M150 50 L170 45" />
    </svg>
  );
}

function FullFaceMask({ className }: Props) {
  return (
    <svg viewBox="0 0 180 180" className={className} {...strokeProps}>
      <ellipse cx="90" cy="90" rx="65" ry="75" fill="currentColor" fillOpacity="0.04" />
      <ellipse cx="90" cy="70" rx="50" ry="30" fill="currentColor" opacity="0.15" stroke="currentColor" />
      <circle cx="90" cy="130" r="15" />
      <circle cx="90" cy="130" r="8" fill="currentColor" opacity="0.3" />
      <path d="M25 90 Q10 85 15 70" />
      <path d="M155 90 Q170 85 165 70" />
    </svg>
  );
}

function FilterCartridge({ className }: Props) {
  return (
    <svg viewBox="0 0 160 160" className={className} {...strokeProps}>
      <circle cx="80" cy="80" r="55" />
      <circle cx="80" cy="80" r="40" fill="currentColor" opacity="0.08" />
      <circle cx="80" cy="80" r="25" />
      <circle cx="80" cy="80" r="10" fill="currentColor" />
      <text x="80" y="145" fontSize="10" textAnchor="middle" fill="currentColor" stroke="none" fontWeight="700">
        A2 B2 E2 K2
      </text>
    </svg>
  );
}

function GastightSuit({ className }: Props) {
  return (
    <svg viewBox="0 0 140 200" className={className} {...strokeProps}>
      <circle cx="70" cy="30" r="18" />
      <path d="M42 60 Q70 50 98 60 L110 170 Q70 180 30 170 Z" fill="currentColor" fillOpacity="0.05" />
      <line x1="70" y1="60" x2="70" y2="170" />
      <rect x="55" y="85" width="30" height="20" rx="2" fill="currentColor" opacity="0.2" />
      <path d="M42 60 L25 90 L30 100" />
      <path d="M98 60 L115 90 L110 100" />
      <path d="M30 170 L25 195" />
      <path d="M110 170 L115 195" />
    </svg>
  );
}

function ScbaBackpack({ className }: Props) {
  return (
    <svg viewBox="0 0 160 180" className={className} {...strokeProps}>
      <rect x="40" y="35" width="80" height="110" rx="8" fill="currentColor" fillOpacity="0.05" />
      <rect x="55" y="50" width="50" height="85" rx="25" fill="currentColor" opacity="0.12" />
      <circle cx="80" cy="55" r="4" />
      <line x1="40" y1="80" x2="20" y2="90" />
      <line x1="40" y1="100" x2="20" y2="110" />
      <line x1="120" y1="80" x2="140" y2="90" />
      <line x1="120" y1="100" x2="140" y2="110" />
      <rect x="25" y="150" width="110" height="15" rx="3" />
    </svg>
  );
}

function EscapeHood({ className }: Props) {
  return (
    <svg viewBox="0 0 140 160" className={className} {...strokeProps}>
      <path d="M30 50 Q70 15 110 50 L115 120 Q70 140 25 120 Z" fill="currentColor" fillOpacity="0.05" />
      <ellipse cx="70" cy="75" rx="28" ry="18" fill="currentColor" opacity="0.15" />
      <circle cx="70" cy="105" r="10" />
      <path d="M30 50 L15 45" />
      <path d="M110 50 L125 45" />
    </svg>
  );
}

const ILLUSTRATIONS: Record<string, (p: Props) => JSX.Element> = {
  // Portátiles
  "x-am-5000": MultiGasDetector,
  "x-am-8000": MultiGasDetector,
  "x-am-3500": PortableDetector,
  "x-pid-9500": PidDetector,
  "x-am-5600": MultiGasDetector,
  "x-am-2800": PortableDetector,
  "x-am-5800": MultiGasDetector,
  "x-am-2600": PortableDetector,
  "catex-sensors": FixedDetector,
  "pid-sensors": PidDetector,
  "ir-sensors": IrDetector,

  // Tubos colorimétricos
  "tubes-short-term": ColorimetricTube,
  "tubes-sampling": ColorimetricTube,
  "x-act-7000": ColorimetricTube,
  accuro: HandPump,

  // Fijos
  "polytron-se-ex": FixedDetector,
  "pex-3000": FixedDetector,
  "polytron-5200-cat": FixedDetector,
  "polytron-8200-cat": FixedDetector,
  "polytron-8700-ir": IrDetector,
  "polytron-5310-ir": IrDetector,
  "polytron-8310-ir": IrDetector,
  "pir-3000": IrDetector,
  "pir-7000": IrDetector,
  "cat-ex-bead": FixedDetector,
  "ir-fixed-sensor": IrDetector,

  // Máscaras
  "x-plore-rd40": FilterCartridge,
  "x-plore-bayonet": FilterCartridge,
  "x-plore-4700": HalfMask,
  "panorama-nova": FullFaceMask,
  "x-plore-6530": FullFaceMask,
  "x-plore-6300": FullFaceMask,
  "x-plore-5500": FullFaceMask,
  "x-plore-3300": HalfMask,

  // Trajes
  "cps-5800": GastightSuit,
  "cps-7900": GastightSuit,
  "cps-7800": GastightSuit,
  "cps-5900": GastightSuit,
  "spc-4700": GastightSuit,

  // Independiente del aire ambiente
  "pas-x-plore": EscapeHood,
  "pas-colt": ScbaBackpack,
  "pas-micro": ScbaBackpack,
  "pas-lite": ScbaBackpack,
  "pss-3000": ScbaBackpack,
  "pss-7000": ScbaBackpack,
  "pss-airboss": ScbaBackpack,
  "saver-pp": EscapeHood,
  "saver-cf": EscapeHood,
};

const CATEGORY_FALLBACK: Record<PPECategoryKey, (p: Props) => JSX.Element> = {
  portable_detectors: PortableDetector,
  colorimetric_tubes: ColorimetricTube,
  fixed_detectors: FixedDetector,
  masks_and_filters: HalfMask,
  suits: GastightSuit,
  air_independent: ScbaBackpack,
};
