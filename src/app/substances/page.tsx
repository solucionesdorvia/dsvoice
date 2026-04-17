import Link from "next/link";

import { SubstanceSearch } from "@/components/substance-search";
import { Formula } from "@/components/formula";
import { prisma } from "@/lib/prisma";
import { searchTerms, translateSubstanceName } from "@/lib/translations";

export const metadata = { title: "Resultados de búsqueda" };

export const dynamic = "force-dynamic";

type SearchParams = {
  searchParams?: { s?: string | string[]; q?: string | string[] };
};

export default async function SubstancesSearchPage({
  searchParams,
}: SearchParams) {
  const rawQuery = searchParams?.s ?? searchParams?.q ?? "";
  const query = Array.isArray(rawQuery) ? rawQuery[0] ?? "" : rawQuery;
  const trimmed = query.trim();

  const terms = searchTerms(trimmed);
  const results = trimmed
    ? await prisma.substance.findMany({
        where: {
          OR: terms.flatMap((t) => [
            { name: { contains: t, mode: "insensitive" as const } },
            { casNumber: { contains: t, mode: "insensitive" as const } },
            { formula: { contains: t, mode: "insensitive" as const } },
            {
              synonyms: {
                some: { synonym: { contains: t, mode: "insensitive" as const } },
              },
            },
          ]),
        },
        select: {
          id: true,
          name: true,
          casNumber: true,
          formula: true,
          ghsPictograms: { select: { pictogramCode: true } },
        },
        take: 100,
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <section className="container max-w-3xl py-10">
      <h1 className="text-2xl font-bold text-brand md:text-3xl">
        Resultados de búsqueda
      </h1>

      <div className="mt-6">
        <SubstanceSearch placeholder="Buscar sustancia, CAS o fórmula…" />
      </div>

      {trimmed ? (
        <>
          <p className="mt-6 text-sm text-muted-foreground">
            {results.length === 0
              ? "Sin resultados"
              : `${results.length} ${
                  results.length === 1 ? "resultado" : "resultados"
                }`}{" "}
            para{" "}
            <span className="font-semibold text-brand">{trimmed}</span>.
          </p>

          {results.length > 0 && (
            <ul className="mt-6 divide-y divide-border/70 border-y border-border/70">
              {results.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/substances/${r.id}`}
                    className="group flex items-start justify-between gap-4 py-4"
                  >
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-brand group-hover:underline">
                        {translateSubstanceName(r.name)}
                      </h2>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {r.formula && (
                          <span className="font-mono">
                            <Formula value={r.formula} />
                          </span>
                        )}
                        {r.casNumber && (
                          <span className="font-mono">CAS {r.casNumber}</span>
                        )}
                        {r.ghsPictograms.length > 0 && (
                          <span className="font-mono">
                            {r.ghsPictograms
                              .map((g) => g.pictogramCode)
                              .sort()
                              .join(" · ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">
          Introduce un término de búsqueda para ver resultados.
        </p>
      )}
    </section>
  );
}
