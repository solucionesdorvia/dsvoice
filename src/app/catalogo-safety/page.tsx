import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { CatalogSafetyClient } from "@/components/catalog-safety-client";
import { partner } from "@/lib/partner";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dräger VOICE — Catálogo DS SAFETY",
};

export default async function CatalogoSafetyPage() {
  const total = await prisma.safetyCatalogItem.count();

  return (
    <div className="container max-w-6xl py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al inicio
      </Link>

      <header className="mb-10 border-b border-border/70 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Buscador 2 · {partner.name}
        </p>
        <h1 className="mt-2 text-balance text-3xl font-black tracking-tight text-brand md:text-4xl">
          Dräger VOICE según catálogo DS SAFETY
        </h1>
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          Productos y equipos Dräger indexados para el cliente a partir del
          catálogo Dräger / DS SAFETY.
        </p>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Buscá por nombre o palabra clave. El índice coincide con el universo
          comercial Dräger (alineado al{" "}
          <a
            href="/catalogo-drager-ds-safety.pdf"
            className="text-brand underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            catálogo digital PDF
          </a>
          ). Las fichas enlazan a la web pública de Dräger cuando hay URL
          disponible.
        </p>
      </header>

      {total === 0 ? (
        <div className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-6 text-sm text-amber-900 dark:text-amber-100">
          <p className="font-medium">El índice del catálogo está vacío.</p>
          <p className="mt-2 text-muted-foreground">
            Ejecutá primero la carga de productos y luego:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              npx tsx prisma/seed-safety-catalog.ts
            </code>
          </p>
        </div>
      ) : (
        <CatalogSafetyClient initialCount={total} />
      )}
    </div>
  );
}
