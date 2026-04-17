"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

import { dragerProductImageUrl } from "@/lib/drager-image";
import { cn } from "@/lib/utils";

export interface ScrapedProduct {
  slug: string;
  name: string;
  tagline: string | null;
  features: string[];
  imageLocal: string | null;
  imageSrc: string | null;
  href: string | null;
  categoryGroup: string | null;
  category: string;
}

export function ProductSuggestions({
  substanceName,
  products,
}: {
  substanceName: string;
  products: ScrapedProduct[];
}) {
  // Group by categoryGroup. If all are empty, group by category directly.
  const groups = useMemo(() => {
    if (products.length === 0) return [] as Array<{ label: string; items: ScrapedProduct[] }>;
    const hasGroups = products.some((p) => p.categoryGroup && p.categoryGroup.trim().length > 0);
    const byKey = new Map<string, ScrapedProduct[]>();
    for (const p of products) {
      const key = hasGroups ? p.categoryGroup || p.category : p.category;
      const arr = byKey.get(key) ?? [];
      arr.push(p);
      byKey.set(key, arr);
    }
    return Array.from(byKey.entries()).map(([label, items]) => ({ label, items }));
  }, [products]);

  const [current, setCurrent] = useState<string | null>(groups[0]?.label ?? null);
  const visible = groups.find((g) => g.label === current) ?? groups[0];

  const sections = useMemo<Array<{ heading: string; items: ScrapedProduct[] }>>(() => {
    if (!visible) return [];
    const byCat = new Map<string, ScrapedProduct[]>();
    for (const p of visible.items) {
      const arr = byCat.get(p.category) ?? [];
      arr.push(p);
      byCat.set(p.category, arr);
    }
    return Array.from(byCat.entries()).map(([heading, items]) => ({ heading, items }));
  }, [visible]);

  if (groups.length === 0) {
    return null;
  }

  return (
    <section className="mt-14 border-t border-border/70 pt-10">
      <h2 className="text-2xl font-bold tracking-tight text-brand md:text-3xl">
        Productos adecuados para {substanceName}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Tanto si necesita detectores de gases portátiles como tubos de detección de gases o equipos
        de protección individual, existe un catálogo completo de productos para protegerle a la
        hora de manipular esta sustancia.
      </p>

      {groups.length > 1 && (
        <div className="mt-6 overflow-x-auto">
          <nav
            role="tablist"
            aria-label="Grupos de producto"
            className="flex min-w-max gap-6 border-b border-border/70 text-sm"
          >
            {groups.map((g) => (
              <button
                key={g.label}
                type="button"
                role="tab"
                aria-selected={g.label === current}
                onClick={() => setCurrent(g.label)}
                className={cn(
                  "relative -mb-px whitespace-nowrap px-1 py-3 font-semibold transition-colors",
                  g.label === current ? "text-brand" : "text-muted-foreground hover:text-brand",
                )}
              >
                {g.label}
                {g.label === current && (
                  <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-brand" />
                )}
              </button>
            ))}
          </nav>
        </div>
      )}

      <div className="mt-8 space-y-10">
        {sections.map((section) => (
          <div key={section.heading}>
            {sections.length > 1 && (
              <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-brand">
                {section.heading}
              </h3>
            )}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {section.items.map((p) => (
                <ProductCardView key={p.slug} product={p} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function resolveImageSrc(product: ScrapedProduct): string | null {
  if (product.imageLocal) return product.imageLocal;
  return dragerProductImageUrl(product.imageSrc);
}

function ProductCardView({ product }: { product: ScrapedProduct }) {
  const src = resolveImageSrc(product);
  return (
    <div className="flex flex-col overflow-hidden rounded-sm border border-border/80 bg-background transition-all hover:border-brand hover:shadow-sm">
      {src ? (
        <div className="relative flex aspect-[4/3] items-center justify-center bg-white p-4">
          <Image
            src={src}
            alt={product.name}
            width={320}
            height={240}
            className="h-full w-full object-contain"
            unoptimized
          />
        </div>
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center bg-secondary/30 text-xs text-muted-foreground">
          Sin imagen
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-lg font-bold leading-tight text-brand">{product.name}</h3>
        {product.tagline && <p className="text-sm text-brand/80">{product.tagline}</p>}
        <ul className="flex-1 space-y-1.5 text-sm leading-snug text-brand/85">
          {product.features.map((f) => (
            <li key={f} className="flex gap-2">
              <span
                aria-hidden
                className="mt-[0.55em] inline-block h-1 w-1 shrink-0 rounded-full bg-brand"
              />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
