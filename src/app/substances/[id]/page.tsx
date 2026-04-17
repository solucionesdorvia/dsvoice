import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { GHSActiveGrid } from "@/components/ghs-grid";
import { LimitsTable } from "@/components/limits-table";
import { Formula } from "@/components/formula";
import { ProductSuggestions } from "@/components/product-suggestions";
import { getSubstanceById } from "@/lib/substance-query";
import { translateSubstanceName } from "@/lib/translations";

export const dynamic = "force-dynamic";

type PageProps = { params: { id: string } };

export async function generateMetadata({ params }: PageProps) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return {};
  const s = await getSubstanceById(id);
  if (!s) return {};
  const name = translateSubstanceName(s.name);
  return {
    title: `${name}${s.formula ? ` (${s.formula})` : ""}`,
    description: `Datos GHS, límites de exposición, indicaciones H/P y propiedades físico-químicas de ${name}${
      s.casNumber ? ` (CAS ${s.casNumber})` : ""
    }.`,
  };
}

export default async function SubstanceDetailPage({ params }: PageProps) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const s = await getSubstanceById(id);
  if (!s) notFound();

  const name = translateSubstanceName(s.name);

  return (
    <div className="container max-w-4xl py-8">
      <Link
        href="/voice"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Dräger VOICE
      </Link>

      <header className="mb-8 border-b border-border/70 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-brand md:text-5xl">
          {name}
          {s.formula && (
            <>
              {" "}
              <Formula value={s.formula} className="font-mono font-bold" />
            </>
          )}
        </h1>
      </header>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="mb-8 overflow-x-auto border-b border-border/70">
          <TabsTrigger value="details">Detalles</TabsTrigger>
          <TabsTrigger value="limits">Valores límite</TabsTrigger>
          <TabsTrigger value="statements">H, P, EUH - Cláusulas</TabsTrigger>
          <TabsTrigger value="properties">Información química</TabsTrigger>
          {s.synonyms.length > 0 && (
            <TabsTrigger value="synonyms">Sinónimos</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="details">
          <div className="grid gap-10 md:grid-cols-2">
            <dl>
              <IdentifierRow label="N.º CAS:" value={s.casNumber} />
              <IdentifierRow label="N.º UN:" value={s.unNumber} />
              <IdentifierRow label="N.º EC:" value={s.ecNumber} />
              <IdentifierRow
                label="ID de peligro:"
                value={s.hazardIdNumber}
              />
              {s.pubchemCid && (
                <IdentifierRow
                  label="PubChem CID:"
                  value={String(s.pubchemCid)}
                />
              )}
            </dl>

            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-brand">
                Pictogramas GHS
              </h3>
              <GHSActiveGrid active={s.ghsPictograms} />
              <p className="mt-8 text-xs text-muted-foreground">
                Fuente: PubChem (NIH/NLM) y GESTIS.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="limits">
          <LimitsTable limits={s.exposureLimits} />
        </TabsContent>

        <TabsContent value="statements" className="space-y-8">
          <StatementBlock
            title="Indicaciones de peligro (H)"
            emptyText="No hay indicaciones H clasificadas."
            items={s.hStatements}
            accent="rose"
          />
          {s.pStatements.length > 0 && (
            <StatementBlock
              title="Consejos de prudencia (P)"
              emptyText="No hay consejos de prudencia P clasificados."
              items={s.pStatements}
              accent="sky"
            />
          )}
        </TabsContent>

        <TabsContent value="properties">
          <PhysicalPropertiesTable
            formula={s.formula}
            props={s.physicalProps}
          />
        </TabsContent>

        <TabsContent value="synonyms">
          {s.synonyms.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay sinónimos disponibles.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2 text-sm">
              {s.synonyms.map((syn) => (
                <li
                  key={syn}
                  className="rounded-sm bg-secondary/60 px-2.5 py-1 text-brand/80"
                >
                  {syn}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <ProductSuggestions substanceName={name} products={s.products} />
    </div>
  );
}

function IdentifierRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="kv-row">
      <dt>{label}</dt>
      <dd>{value ?? <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

function StatementBlock({
  title,
  emptyText,
  items,
  accent,
}: {
  title: string;
  emptyText: string;
  items: Array<{ code: string; text: string }>;
  accent: "rose" | "sky";
}) {
  const accentClass =
    accent === "rose"
      ? "bg-rose-50 text-rose-900 ring-rose-200"
      : "bg-sky-50 text-sky-900 ring-sky-200";

  return (
    <div>
      <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-brand">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-border/70 border-y border-border/70">
          {items.map(({ code, text }) => (
            <li key={code} className="flex gap-4 py-3">
              <span
                className={`inline-flex h-fit shrink-0 items-center rounded-sm px-2 py-1 font-mono text-xs font-bold ring-1 ${accentClass}`}
              >
                {code}
              </span>
              <p className="pt-0.5 text-sm leading-relaxed text-brand">{text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PhysicalPropertiesTable({
  formula,
  props,
}: {
  formula: string | null | undefined;
  props: {
    decompositionTempC: number | null;
    meltingPointC: number | null;
    boilingPointC: number | null;
    densityGCm3: number | null;
    ionizationEv: number | null;
    flashPointC: number | null;
    ignitionTempC: number | null;
    lelVolPct: number | null;
    uelVolPct: number | null;
    vaporPressureHPa: number | null;
    molarMassGMol: number | null;
    hazardousEffects: string | null;
  } | null;
}) {
  const rows: Array<{ label: string; node: React.ReactNode }> = [
    {
      label: "Fórmula molecular:",
      node: formula ? <Formula value={formula} className="font-mono" /> : null,
    },
    { label: "Masa molar:", node: unit(props?.molarMassGMol, "g/mol") },
    { label: "Punto de fusión:", node: unit(props?.meltingPointC, "°C") },
    { label: "Punto de ebullición:", node: unit(props?.boilingPointC, "°C") },
    {
      label: "Temperatura de descomposición:",
      node: unit(props?.decompositionTempC, "°C"),
    },
    { label: "Densidad:", node: unit(props?.densityGCm3, "g/cm³") },
    { label: "Presión de vapor:", node: unit(props?.vaporPressureHPa, "hPa") },
    { label: "Energía de ionización:", node: unit(props?.ionizationEv, "eV") },
    { label: "Punto de inflamación:", node: unit(props?.flashPointC, "°C") },
    {
      label: "Temperatura de ignición:",
      node: unit(props?.ignitionTempC, "°C"),
    },
    {
      label: "Límite inferior de explosividad:",
      node: unit(props?.lelVolPct, "% vol"),
    },
    {
      label: "Límite superior de explosividad:",
      node: unit(props?.uelVolPct, "% vol"),
    },
    {
      label: "Efectos peligrosos:",
      node: props?.hazardousEffects ? (
        <span className="font-sans">{props.hazardousEffects}</span>
      ) : null,
    },
  ];

  const visible = rows.filter((r) => r.node !== null);

  if (visible.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay información química disponible para esta sustancia.
      </p>
    );
  }

  return (
    <dl className="max-w-3xl">
      {visible.map((r) => (
        <div key={r.label} className="kv-row">
          <dt>{r.label}</dt>
          <dd>{r.node}</dd>
        </div>
      ))}
    </dl>
  );
}

function unit(v: number | null | undefined, u: string): React.ReactNode {
  if (v === null || v === undefined) return null;
  return (
    <>
      <span>{formatNum(v)}</span>
      <span className="ml-1 text-muted-foreground">{u}</span>
    </>
  );
}

function formatNum(v: number): string {
  if (Number.isInteger(v)) return v.toLocaleString("es-ES");
  return v.toLocaleString("es-ES", { maximumFractionDigits: 3 });
}
