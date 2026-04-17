import Link from "next/link";
import { FlaskConical, PackageSearch } from "lucide-react";

import { partner } from "@/lib/partner";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Inicio",
};

export default async function Home() {
  const [totalSubs, catalogTotal] = await Promise.all([
    prisma.substance.count(),
    prisma.safetyCatalogItem.count(),
  ]);

  return (
    <div className="container max-w-4xl py-14 md:py-24">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Muestra de funcionamiento DS SAFETY VOICE
      </p>
      <h1 className="mt-3 text-balance text-center text-3xl font-black tracking-tight text-brand md:text-5xl">
        ¿Qué querés consultar?
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground md:text-lg">
        Dos buscadores independientes: sustancias (Dräger VOICE) y productos
        según el índice del catálogo DS SAFETY.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-2 md:gap-8">
        {/* Buscador 1 */}
        <Link
          href="/voice"
          className="group flex flex-col rounded-2xl border border-border/80 bg-background p-6 shadow-sm transition-all hover:border-brand hover:shadow-md md:p-8"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors group-hover:bg-brand/15">
            <FlaskConical className="h-6 w-6" aria-hidden />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Buscador 1
          </p>
          <h2 className="mt-2 text-xl font-bold text-brand md:text-2xl">
            Dräger VOICE
          </h2>
          <p className="mt-2 flex-1 text-sm text-muted-foreground">
            Sustancias peligrosas: CAS, fórmula, GHS, indicaciones H y fichas
            técnicas.
          </p>
          <p className="mt-4 text-xs font-medium text-brand">
            {totalSubs.toLocaleString("es-ES")} sustancias →
          </p>
        </Link>

        {/* Buscador 2 */}
        <Link
          href="/catalogo-safety"
          className="group flex flex-col rounded-2xl border border-brand/30 bg-brand/[0.04] p-6 shadow-sm transition-all hover:border-brand hover:bg-brand/[0.07] hover:shadow-md md:p-8"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand/15 text-brand">
            <PackageSearch className="h-6 w-6" aria-hidden />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Buscador 2
          </p>
          <h2 className="mt-2 text-xl font-bold text-brand md:text-2xl">
            Dräger VOICE según catálogo DS SAFETY
          </h2>
          <p className="mt-2 flex-1 text-sm text-muted-foreground">
            Productos y equipos Dräger indexados según el catálogo digital del
            distribuidor (referencias, categorías y descripciones).
          </p>
          <p className="mt-4 text-xs font-medium text-brand">
            {catalogTotal.toLocaleString("es-ES")} referencias en índice →
          </p>
        </Link>
      </div>

      <p className="mt-12 text-center text-xs text-muted-foreground">
        {partner.catalogUrl ? (
          <>
            <a
              href={partner.catalogUrl}
              target="_blank"
              rel="noreferrer"
              className="text-brand underline-offset-2 hover:underline"
            >
              {partner.catalogLabel}
            </a>
            {" · "}
          </>
        ) : null}
        <Link href="/about" className="underline-offset-2 hover:underline">
          Acerca de
        </Link>
      </p>
    </div>
  );
}
