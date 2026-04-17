import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container flex max-w-md flex-col items-center gap-4 py-24 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="text-3xl font-bold tracking-tight text-brand">
        Sustancia no encontrada
      </h1>
      <p className="text-sm text-muted-foreground">
        Prueba a buscar por nombre, número CAS o fórmula.
      </p>
      <Link
        href="/"
        className="inline-flex h-10 items-center rounded-sm bg-brand px-4 text-sm font-semibold text-brand-foreground hover:bg-brand/90"
      >
        Ir al buscador
      </Link>
    </div>
  );
}
