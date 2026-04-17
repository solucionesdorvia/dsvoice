/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";
import { GHS_PICTOGRAMS, GHS_CODES } from "@/lib/ghs";

/**
 * Muestra los 9 pictogramas GHS, atenuando los inactivos.
 */
export function GHSGrid({
  active,
  className,
}: {
  active: string[];
  className?: string;
}) {
  const set = new Set(active);
  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-9",
        className
      )}
    >
      {GHS_CODES.map((code) => {
        const meta = GHS_PICTOGRAMS[code];
        const isActive = set.has(code);
        return (
          <div
            key={code}
            className={cn(
              "group flex flex-col items-center gap-1.5 rounded-sm border p-2 transition-all",
              isActive
                ? "border-primary/40 bg-primary/5 shadow-sm"
                : "border-transparent opacity-30 grayscale"
            )}
            title={`${code} – ${meta.name}`}
          >
            <div className="relative h-14 w-14">
              <img
                src={meta.url}
                alt={meta.name}
                width={56}
                height={56}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="text-center">
              <div className="font-mono text-[10px] font-semibold">{code}</div>
              <div className="line-clamp-2 text-[10px] text-muted-foreground">
                {meta.name}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Variante que sólo muestra los pictogramas activos, con etiqueta gris bajo
 * cada uno (como el layout de la ficha de Dräger VOICE).
 */
export function GHSActiveGrid({
  active,
  className,
}: {
  active: string[];
  className?: string;
}) {
  if (active.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sin pictogramas GHS clasificados.
      </p>
    );
  }

  return (
    <div
      className={cn("flex flex-wrap gap-4", className)}
      role="list"
      aria-label="Pictogramas GHS"
    >
      {active.map((code) => {
        const meta = GHS_PICTOGRAMS[code];
        if (!meta) return null;
        return (
          <figure
            key={code}
            role="listitem"
            className="flex flex-col items-center"
            title={`${code} – ${meta.name}`}
          >
            <img
              src={meta.url}
              alt={meta.name}
              width={96}
              height={96}
              className="h-24 w-24 object-contain"
            />
            <figcaption className="-mt-2 rounded-sm bg-[#9A9A9A] px-4 py-[3px] text-xs font-semibold text-white">
              {code}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
