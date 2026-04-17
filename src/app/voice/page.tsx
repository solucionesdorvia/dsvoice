import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { SubstanceSearch } from "@/components/substance-search";
import { partner } from "@/lib/partner";
import { prisma } from "@/lib/prisma";
import { translateSubstanceName } from "@/lib/translations";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dräger VOICE — Sustancias",
};

const POPULAR_CAS = [
  "67-64-1",
  "71-43-2",
  "7664-41-7",
  "7783-06-4",
  "7782-50-5",
  "630-08-0",
  "108-88-3",
  "67-56-1",
];

export default async function VoicePage() {
  const [total, popular] = await Promise.all([
    prisma.substance.count(),
    prisma.substance.findMany({
      where: { casNumber: { in: POPULAR_CAS } },
      select: { id: true, name: true, casNumber: true },
    }),
  ]);

  popular.sort((a, b) => {
    const ai = POPULAR_CAS.indexOf(a.casNumber ?? "");
    const bi = POPULAR_CAS.indexOf(b.casNumber ?? "");
    return ai - bi;
  });

  return (
    <div className="container max-w-3xl py-10 md:py-14">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al inicio
      </Link>

      <header className="mb-8 border-b border-border/70 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Buscador 1 · Dräger VOICE
        </p>
        <h1 className="mt-3 text-balance text-3xl font-black tracking-tight text-brand md:text-5xl">
          Sustancias peligrosas
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground md:text-lg">
          Base de datos de sustancias al estilo Dräger VOICE: buscá por nombre,
          CAS o fórmula y accedé a GHS, indicaciones H, propiedades y
          sugerencias de productos por sustancia.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/40 px-3 py-1">
            {total.toLocaleString("es-ES")} sustancias indexadas
          </span>
          {" · "}
          <span>
            Implementado por{" "}
            <strong className="font-medium text-foreground/85">{partner.name}</strong>
          </span>
        </p>
      </header>

      <div>
        <SubstanceSearch
          autoFocus
          placeholder="Ej. acetona, 67-64-1, C3H6O…"
        />
      </div>

      {popular.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Ejemplos:</span>
          {popular.map((s) => (
            <Link
              key={s.id}
              href={`/substances/${s.id}`}
              title={s.name}
              className="rounded-full border border-border bg-background px-3 py-1 text-foreground transition-colors hover:border-brand hover:text-brand"
            >
              {translateSubstanceName(s.name)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
