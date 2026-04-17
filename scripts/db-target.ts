/**
 * Muestra a qué base apunta DATABASE_URL (sin contraseña) y cuántas sustancias hay.
 * Uso: npx tsx scripts/db-target.ts
 */
import { PrismaClient } from "@prisma/client";

function maskUrl(raw: string): string {
  try {
    const u = new URL(raw.replace(/^postgresql:/i, "http:"));
    u.password = "****";
    return u.toString().replace(/^http:/i, "postgresql:");
  } catch {
    return "(URL inválida)";
  }
}

function hostFromUrl(raw: string): string {
  try {
    const u = new URL(raw.replace(/^postgresql:/i, "http:"));
    return `${u.hostname}${u.port ? `:${u.port}` : ""}`;
  } catch {
    return "?";
  }
}

async function main() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    console.log("❌ DATABASE_URL no está definida. Creá .env con DATABASE_URL=...");
    process.exit(1);
  }

  console.log("Conexión (contraseña oculta):");
  console.log(" ", maskUrl(raw));
  console.log("Host:", hostFromUrl(raw));
  console.log("");

  if (raw.includes("localhost") || raw.includes("127.0.0.1")) {
    console.log(
      "⚠️  Estás apuntando a POSTGRES LOCAL. El seed llena SOLO esta máquina, no Railway."
    );
    console.log(
      "   Para cargar Railway: en Railway → Postgres → Variables → copiá DATABASE_URL"
    );
    console.log(
      "   (URL pública si conectás desde tu PC), pegala en .env y volvé a correr el seed.\n"
    );
  } else if (raw.includes("railway")) {
    console.log(
      "✓ Parece una URL de Railway. Si coincide con la variable del servicio web, el panel debería verse igual.\n"
    );
  }

  const prisma = new PrismaClient();
  try {
    const [subs, phys, products] = await Promise.all([
      prisma.substance.count(),
      prisma.physicalProperties.count(),
      prisma.product.count(),
    ]);
    console.log("Datos en ESTA conexión:");
    console.log(`  Substance:            ${subs}`);
    console.log(`  PhysicalProperties:   ${phys}`);
    console.log(`  Product:              ${products}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
