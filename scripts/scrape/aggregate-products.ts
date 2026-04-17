/**
 * Aggregates all unique products mentioned across scraped substance JSONs,
 * writes a normalized product catalogue JSON, and (optionally) downloads the
 * product images locally so they are served from our own domain.
 *
 * Flags:
 *   --no-images          Skip downloading; only write the JSON.
 *   --concurrency=N      Number of parallel image downloads (default: 8).
 *   --out=PATH           Output JSON path (default: scraped/products.json).
 *
 * Writes:
 *   scraped/products.json
 *   public/product-images/{slug}{ext}
 */
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

interface ScrapedProduct {
  name: string;
  tagline: string | null;
  features: string[];
  image: string | null;
  href: string | null;
}

interface SubstanceData {
  id: number;
  productCategories: Array<{
    categoryGroup: string;
    category: string;
    products: ScrapedProduct[];
  }>;
}

interface AggregatedProduct {
  slug: string;
  name: string;
  tagline: string | null;
  features: string[];
  imageSrc: string | null;
  imageLocal: string | null;
  href: string | null;
  appearsInSubstances: number[];
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function slugFromHref(href: string | null | undefined, fallback: string): string {
  if (href) {
    const m = href.match(/\/Products\/([^#?/]+)/i);
    if (m) return slugify(m[1]);
  }
  return slugify(fallback);
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const has = (flag: string) => argv.includes(flag);
  const get = (name: string, d: string) => {
    const m = argv.find((a) => a.startsWith(`--${name}=`));
    return m ? m.split("=").slice(1).join("=") : d;
  };
  return {
    downloadImages: !has("--no-images"),
    concurrency: parseInt(get("concurrency", "8"), 10),
    out: get("out", "scraped/products.json"),
    subDir: get("subDir", "scraped/substances"),
  };
}

async function writeCatalog(list: AggregatedProduct[], out: string) {
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, JSON.stringify(list, null, 2), "utf8");
}

async function main() {
  const args = parseArgs();

  const entries = await fs.readdir(args.subDir);
  const jsonFiles = entries.filter((e) => e.endsWith(".json"));
  console.log(`[aggregate] reading ${jsonFiles.length} substance JSONs`);

  const products = new Map<string, AggregatedProduct>();
  for (const f of jsonFiles) {
    const raw = await fs.readFile(path.join(args.subDir, f), "utf8");
    let data: SubstanceData;
    try {
      data = JSON.parse(raw) as SubstanceData;
    } catch {
      continue;
    }
    for (const cat of data.productCategories ?? []) {
      for (const p of cat.products ?? []) {
        const slug = slugFromHref(p.href, p.name);
        if (!slug) continue;
        const existing = products.get(slug);
        if (existing) {
          existing.appearsInSubstances.push(data.id);
          if (!existing.tagline && p.tagline) existing.tagline = p.tagline;
          if ((!existing.features || existing.features.length === 0) && p.features.length > 0)
            existing.features = p.features;
          if (!existing.imageSrc && p.image) existing.imageSrc = p.image;
          if (!existing.href && p.href) existing.href = p.href;
        } else {
          products.set(slug, {
            slug,
            name: p.name,
            tagline: p.tagline,
            features: p.features,
            imageSrc: p.image,
            imageLocal: null,
            href: p.href,
            appearsInSubstances: [data.id],
          });
        }
      }
    }
  }

  const list = Array.from(products.values()).sort((a, b) => a.slug.localeCompare(b.slug));
  console.log(`[aggregate] ${list.length} unique products`);

  // Detect already downloaded images so --no-images doesn't reset them.
  const imgDir = "public/product-images";
  await fs.mkdir(imgDir, { recursive: true });
  const existing = new Set(await fs.readdir(imgDir));
  for (const p of list) {
    if (!p.imageSrc) continue;
    const ext = (path.extname(new URL(p.imageSrc, "https://www.draeger.com").pathname) || ".jpg").toLowerCase();
    if (existing.has(`${p.slug}${ext}`)) {
      p.imageLocal = `/product-images/${p.slug}${ext}`;
    }
  }

  // Write a first pass so downstream scripts have something to consume even if
  // we skip image downloading or it's interrupted.
  await writeCatalog(list, args.out);
  console.log(`[aggregate] wrote ${args.out} (${list.length} products)`);

  if (!args.downloadImages) return;

  const pending = list.filter((p) => p.imageSrc && !p.imageLocal);
  console.log(`[image] ${pending.length} images to download (concurrency=${args.concurrency})`);
  if (pending.length === 0) return;

  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    locale: "es-ES",
  });
  {
    const w = await ctx.newPage();
    await w.goto("https://www.draeger.com/es_csa/Home", { waitUntil: "domcontentloaded" }).catch(() => {});
    await w.close();
  }

  let ok = 0;
  let fail = 0;
  const start = Date.now();
  let idx = 0;
  async function worker() {
    while (true) {
      const my = idx++;
      if (my >= pending.length) return;
      const p = pending[my];
      if (!p.imageSrc) continue;
      const url = p.imageSrc.startsWith("http") ? p.imageSrc : `https://www.draeger.com${p.imageSrc}`;
      const ext = (path.extname(new URL(url).pathname) || ".jpg").toLowerCase();
      const file = path.join(imgDir, `${p.slug}${ext}`);
      p.imageLocal = `/product-images/${p.slug}${ext}`;
      try {
        const resp = await ctx.request.get(url, { timeout: 20000 });
        if (!resp.ok()) throw new Error(`status ${resp.status()}`);
        const buf = await resp.body();
        if (buf.length < 500) throw new Error(`too small ${buf.length}b`);
        await fs.writeFile(file, buf);
        ok++;
      } catch (err) {
        fail++;
        p.imageLocal = null;
        console.warn(`[image] ${p.slug}: ${String(err).slice(0, 80)}`);
      }
      if ((ok + fail) % 25 === 0) {
        const elapsed = (Date.now() - start) / 1000;
        const rate = (ok + fail) / Math.max(elapsed, 1);
        console.log(
          `[image] ${ok + fail}/${pending.length} ok=${ok} fail=${fail} rate=${rate.toFixed(1)}/s`,
        );
        // Flush periodically so we don't lose progress on crash.
        await writeCatalog(list, args.out);
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.max(1, args.concurrency) }, () => worker()),
  );
  console.log(`[image] done: ok=${ok} fail=${fail}`);
  await ctx.close();
  await browser.close();

  await writeCatalog(list, args.out);
  console.log(`[aggregate] final write to ${args.out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
