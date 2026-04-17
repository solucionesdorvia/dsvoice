"use client";

import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import Image from "next/image";
import { Loader2, Package, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { dragerProductImageUrl } from "@/lib/drager-image";
import { cn } from "@/lib/utils";

type Row = {
  id: number;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  imageSrc: string | null;
  href: string | null;
};

export function CatalogSafetyClient({
  initialCount,
}: {
  initialCount: number;
}) {
  const [query, setQuery] = useState("");
  const [debounced] = useDebounce(query, 280);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const u = `/api/catalog-safety/search?q=${encodeURIComponent(debounced)}&limit=60`;
    fetch(u)
      .then((r) => r.json())
      .then((data: Row[]) => {
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const grouped = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const r of rows) {
      const arr = m.get(r.category) ?? [];
      arr.push(r);
      m.set(r.category, arr);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0], "es"));
  }, [rows]);

  return (
    <div className="space-y-8">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, categoría o palabra clave…"
          className="h-12 pl-10 text-base"
          aria-label="Buscar en el catálogo DS SAFETY"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {initialCount.toLocaleString("es-ES")} referencias en el índice. Filtrá
        por nombre, categoría o palabra clave (texto indexado del catálogo DS
        SAFETY).
      </p>

      {!loading && rows.length === 0 && (
        <p className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          No hay resultados para esta búsqueda.
        </p>
      )}

      <div className="space-y-10">
        {grouped.map(([category, items]) => (
          <div key={category}>
            <h2 className="mb-4 border-b border-border/70 pb-2 text-sm font-bold uppercase tracking-wide text-brand">
              {category}
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <li key={item.id}>
                  <article
                    className={cn(
                      "flex h-full flex-col overflow-hidden rounded-md border border-border/80 bg-background transition-colors hover:border-brand",
                    )}
                  >
                    <div className="relative flex aspect-[4/3] items-center justify-center bg-white p-3">
                      {dragerProductImageUrl(item.imageSrc) ? (
                        <Image
                          src={dragerProductImageUrl(item.imageSrc)!}
                          alt={item.name}
                          width={280}
                          height={210}
                          className="max-h-full max-w-full object-contain"
                          unoptimized
                        />
                      ) : (
                        <Package className="h-12 w-12 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-4">
                      <h3 className="font-bold leading-snug text-brand">
                        {item.href ? (
                          <a
                            href={
                              item.href.startsWith("http")
                                ? item.href
                                : `https://www.draeger.com${item.href}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline"
                          >
                            {item.name}
                          </a>
                        ) : (
                          item.name
                        )}
                      </h3>
                      {item.description ? (
                        <p className="line-clamp-4 text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
