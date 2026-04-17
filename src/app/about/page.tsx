import Link from "next/link";

import { partner, hasCatalogLink } from "@/lib/partner";

export const metadata = {
  title: "Acerca de",
};

export default function AboutPage() {
  return (
    <article className="container max-w-2xl py-12">
      <h1 className="text-3xl font-bold tracking-tight text-brand">
        VOICE y {partner.name}
      </h1>
      <p className="mt-3 text-muted-foreground">
        Hay <strong className="text-foreground/90">dos buscadores</strong> en el{" "}
        <Link href="/" className="text-brand underline-offset-2 hover:underline">
          inicio
        </Link>
        :{" "}
        <Link href="/voice" className="text-brand underline-offset-2 hover:underline">
          Dräger VOICE
        </Link>{" "}
        (sustancias) y{" "}
        <Link href="/catalogo-safety" className="text-brand underline-offset-2 hover:underline">
          Dräger VOICE según catálogo DS SAFETY
        </Link>{" "}
        (productos indexados según el{" "}
        <strong className="text-foreground/90">{partner.catalogLabel}</strong>
        ).
      </p>

      <h2 className="mt-10 text-lg font-bold text-brand">
        {partner.name} como implementador
      </h2>
      <p className="mt-3 text-sm text-muted-foreground">
        <strong className="font-medium text-foreground/85">{partner.name}</strong>{" "}
        integra esta herramienta para apoyar la selección de equipos y
        consumibles de seguridad (detección de gases, protección respiratoria,
        trajes, etc.) en línea con el catálogo y la oferta comercial Dräger que
        distribuyen.
      </p>
      {hasCatalogLink() ? (
        <p className="mt-4 text-sm">
          <a
            href={partner.catalogUrl}
            className="text-brand underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Abrir {partner.catalogLabel} (PDF o recurso público)
          </a>
        </p>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Podés enlazar el PDF del catálogo públicamente configurando{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            NEXT_PUBLIC_CATALOG_URL
          </code>{" "}
          en el entorno de despliegue.
        </p>
      )}

      <h2 className="mt-10 text-lg font-bold text-brand">Fuentes de datos</h2>
      <ul className="mt-3 space-y-2 text-sm text-brand/85">
        <li>
          Contenido de fichas y recomendaciones de productos derivado del
          referente público{" "}
          <a
            className="text-brand underline-offset-2 hover:underline"
            href="https://www.draeger.com/"
            target="_blank"
            rel="noreferrer"
          >
            Dräger VOICE
          </a>{" "}
          (sustancias y sugerencias de equipos en el sitio de Dräger).
        </li>
        <li>
          Pictogramas y metadatos auxiliares pueden apoyarse en{" "}
          <a
            className="text-brand underline-offset-2 hover:underline"
            href="https://pubchem.ncbi.nlm.nih.gov/"
            target="_blank"
            rel="noreferrer"
          >
            PubChem
          </a>{" "}
          (NIH/NLM).
        </li>
        <li>
          Textos de indicaciones H en español según tablas GHS/CLP consolidadas
          en la aplicación (
          <Link href="/" className="underline-offset-2 hover:underline">
            ver buscador
          </Link>
          ).
        </li>
      </ul>

      <h2 className="mt-10 text-lg font-bold text-brand">
        Marcas y uso responsable
      </h2>
      <p className="mt-3 text-sm text-muted-foreground">
        <strong className="font-medium text-foreground/80">
          Dräger® es marca registrada de Drägerwerk AG &amp; Co. KGaA.
        </strong>{" "}
        Este proyecto no está afiliado ni avalado por Dräger; la información se
        ofrece con fines informativos y de apoyo a la consulta, sin sustituir
        fichas de datos de seguridad (FDS), manuales del fabricante ni normativa
        local.
      </p>

      <h2 className="mt-10 text-lg font-bold text-brand">Aviso</h2>
      <p className="mt-3 text-sm text-muted-foreground">
        Consulte siempre la FDS, las instrucciones del equipo y la regulación
        aplicable en su país antes de tomar decisiones de protección laboral o
        ambiental.
      </p>
    </article>
  );
}
