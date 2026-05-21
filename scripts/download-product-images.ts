/**
 * Descarga las imágenes de productos del catálogo desde draeger.com
 * usando un browser headless (Playwright) para sortear el bloqueo
 * anti-hotlinking. Las guarda en public/products/ y emite un mapeo
 * slug → archivo local para que el seed actualice imageSrc.
 *
 * Uso:
 *   npx tsx scripts/download-product-images.ts
 */
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "public", "products");
const DRAEGER_BASE = "https://www.draeger.com";

interface Item {
  slug: string;
  imageSrc: string | null;
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function extOf(url: string): string {
  const m = url.match(/\.(jpe?g|png|webp|avif|gif)(?:$|\?)/i);
  return m ? m[1].toLowerCase() : "jpg";
}

async function main() {
  await ensureDir(OUT_DIR);

  const prisma = new PrismaClient();
  const items = (await prisma.safetyCatalogItem.findMany({
    select: { slug: true, imageSrc: true },
  })) as Item[];
  await prisma.$disconnect();

  console.log(`[download] ${items.length} productos en el catálogo`);

  const targets = items.filter((it) => it.imageSrc && it.slug);
  console.log(`[download] ${targets.length} con imageSrc`);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    locale: "es-AR",
    viewport: { width: 1280, height: 800 },
    extraHTTPHeaders: {
      Accept:
        "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
      Referer: "https://www.draeger.com/",
    },
  });
  // Necesario para que el referer sea válido en la primera request.
  const page = await ctx.newPage();
  await page.goto("https://www.draeger.com/", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  }).catch((e) => console.warn("[warm-up] fallo goto draeger:", e.message));

  let ok = 0,
    fail = 0,
    skipped = 0;
  for (let i = 0; i < targets.length; i++) {
    const it = targets[i];
    if (!it.imageSrc) {
      skipped++;
      continue;
    }
    const url = it.imageSrc.startsWith("http")
      ? it.imageSrc
      : DRAEGER_BASE + (it.imageSrc.startsWith("/") ? it.imageSrc : "/" + it.imageSrc);
    const fname = `${it.slug}.${extOf(url)}`;
    const dest = path.join(OUT_DIR, fname);

    try {
      const res = await ctx.request.get(url, { timeout: 30_000 });
      if (!res.ok()) throw new Error(`HTTP ${res.status()}`);
      const buf = await res.body();
      if (!buf.length) throw new Error("empty body");
      await fs.writeFile(dest, buf);
      ok++;
      if ((i + 1) % 10 === 0 || i === targets.length - 1) {
        console.log(`[download] ${i + 1}/${targets.length} ok=${ok} fail=${fail}`);
      }
    } catch (e: any) {
      fail++;
      console.warn(`[download] FAIL ${it.slug}: ${e.message}`);
    }
  }

  await browser.close();
  console.log(`\n[done] ok=${ok} fail=${fail} skipped=${skipped} → ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
