import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Limit = {
  countryCode: string;
  authority: string;
  limitType: string;
  valuePpm: number | null;
  valueMgM3: number | null;
  notes: string | null;
};

type Pivoted = {
  authority: string;
  country: string;
  twaPpm?: string;
  twaMgM3?: string;
  stelPpm?: string;
  stelMgM3?: string;
  ceilingPpm?: string;
  idlh?: string;
  notes: string[];
};

function fmt(v: number | null | undefined): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (v === 0) return "0";
  if (v < 0.01) return v.toExponential(2);
  if (v < 1) return v.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  if (v < 100) return v.toFixed(1).replace(/\.0$/, "");
  return v.toFixed(0);
}

function pivot(limits: Limit[]): Pivoted[] {
  const byKey = new Map<string, Pivoted>();
  for (const l of limits) {
    const key = `${l.countryCode}:${l.authority}`;
    const row: Pivoted = byKey.get(key) ?? {
      authority: l.authority,
      country: l.countryCode,
      notes: [],
    };
    const t = l.limitType.toUpperCase();
    if (t === "TWA") {
      row.twaPpm = fmt(l.valuePpm) ?? row.twaPpm;
      row.twaMgM3 = fmt(l.valueMgM3) ?? row.twaMgM3;
    } else if (t === "STEL") {
      row.stelPpm = fmt(l.valuePpm) ?? row.stelPpm;
      row.stelMgM3 = fmt(l.valueMgM3) ?? row.stelMgM3;
    } else if (t === "CEILING" || t === "C") {
      row.ceilingPpm = fmt(l.valuePpm) ?? row.ceilingPpm;
    } else if (t === "IDLH") {
      row.idlh = fmt(l.valuePpm) ?? row.idlh;
    }
    if (l.notes) row.notes.push(l.notes);
    byKey.set(key, row);
  }
  return Array.from(byKey.values()).sort((a, b) =>
    (a.country + a.authority).localeCompare(b.country + b.authority)
  );
}

export function LimitsTable({ limits }: { limits: Limit[] }) {
  if (limits.length === 0) {
    return (
      <p className="rounded-sm border border-border/70 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        No hay valores límite de exposición profesional publicados para esta sustancia.
      </p>
    );
  }

  const rows = pivot(limits);

  return (
    <div className="overflow-hidden rounded-sm border border-border/70">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>País</TableHead>
            <TableHead>Autoridad</TableHead>
            <TableHead className="text-right">VLA-ED (ppm)</TableHead>
            <TableHead className="text-right">VLA-ED (mg/m³)</TableHead>
            <TableHead className="text-right">VLA-EC (ppm)</TableHead>
            <TableHead className="text-right">VLA-EC (mg/m³)</TableHead>
            <TableHead className="text-right">Techo (ppm)</TableHead>
            <TableHead className="text-right">IPVS (ppm)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell className="font-mono text-xs">{r.country}</TableCell>
              <TableCell className="font-medium">{r.authority}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {r.twaPpm ?? "—"}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {r.twaMgM3 ?? "—"}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {r.stelPpm ?? "—"}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {r.stelMgM3 ?? "—"}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {r.ceilingPpm ?? "—"}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {r.idlh ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
