/**
 * Scraper PROFUNDO de productos Dräger:
 *   - Vista general (Características destacadas)
 *   - Especificaciones (Datos generales / Técnicas / Homologaciones)
 *   - Sistema (productos del sistema / accesorios)
 *   - Descargas (PDFs, manuales)
 *   - Productos similares
 *
 * Lee los slugs+href de scraped/products.json (catálogo agregado) y para
 * cada uno visita la página oficial en draeger.com con Playwright (Chrome
 * real, pasa el anti-hotlinking de Dräger). Guarda los detalles en
 * scraped/product-details/<slug>.json para que el seed los persista en BD.
 *
 * Uso:
 *   npx tsx scripts/scrape/scrape-product-details.ts
 *   npx tsx scripts/scrape/scrape-product-details.ts --only=5    # primeros 5
 *   npx tsx scripts/scrape/scrape-product-details.ts --slug=pex-3000
 */
import { chromium, Page } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "scraped", "product-details");
const DRAEGER_BASE = "https://www.draeger.com";

interface AggregatedProduct {
  slug: string;
  name: string;
  href: string | null;
}

interface ScrapedDetail {
  slug: string;
  url: string;
  scrapedAt: string;
  overview: { text: string | null; htmlSummary: string | null } | null;
  specifications: { group: string; rows: { key: string; value: string }[] }[];
  system: { name: string; href: string | null; imageSrc: string | null }[];
  downloads: { label: string; href: string; type: string | null }[];
  similar: { name: string; slug: string | null; href: string | null; imageSrc: string | null }[];
  raw: { titlesFound: string[] };
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function scrapeOne(page: Page, url: string): Promise<Omit<ScrapedDetail, "slug" | "url" | "scrapedAt">> {
  await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
  // Esperar a que carguen las secciones críticas (BenefitSection es Vista general).
  await page
    .waitForSelector("#BenefitSection, #DownloadSection, table", { timeout: 25_000 })
    .catch(() => {});
  // Scroll forzado para gatillar lazy-load de las secciones (desde Node,
  // no en page.evaluate, para evitar conflictos con la transformación tsx).
  let lastH = 0;
  for (let i = 0; i < 30; i++) {
    const h = await page.evaluate("document.body.scrollHeight");
    await page.evaluate(`window.scrollTo(0, ${i * 600})`);
    await page.waitForTimeout(180);
    if (typeof h === "number" && h === lastH && i > 10) break;
    if (typeof h === "number") lastH = h;
  }
  await page.evaluate("window.scrollTo(0, 0)");
  await page.waitForTimeout(500);

  // Importante: pasamos el código como string para evitar que tsx
  // transforme las arrow functions con __name() helpers que el browser
  // no tiene (incompatible con page.evaluate).
  return (await page.evaluate(SCRAPER_DOM_FN)) as Omit<ScrapedDetail, "slug" | "url" | "scrapedAt">;
}

// Función de scraping del DOM (corre dentro del browser). Pasada como
// string a page.evaluate() porque tsx introduce __name helpers en TS.
const SCRAPER_DOM_FN = `(() => {
  var clean = function (s) { return (s || "").replace(/\\s+/g, " ").trim(); };

  // Vista general
  var overviewSection = document.querySelector("#BenefitSection");
  var overviewText = overviewSection ? clean(overviewSection.innerText).slice(0, 4000) : null;
  var overviewParas = null;
  if (overviewSection) {
    var paras = [];
    overviewSection.querySelectorAll("p").forEach(function (p) {
      var t = clean(p.innerText);
      if (t.length > 30) paras.push(t);
    });
    overviewParas = paras.slice(0, 6).join("\\n\\n");
  }

  // Especificaciones: estrategia simple — agarrar TODAS las tablas de la
  // página y para cada una buscar el h3/h4 más cercano hacia arriba como
  // título de grupo (con un fallback genérico).
  var specs = [];
  var extractTable = function (table) {
    var rows = [];
    table.querySelectorAll("tr").forEach(function (tr) {
      var cells = tr.querySelectorAll("th, td");
      if (cells.length < 2) return;
      rows.push({ key: clean(cells[0].textContent), value: clean(cells[1].textContent) });
    });
    return rows;
  };
  var findPrevHeading = function (table) {
    // Sube por el árbol y mira siblings previos hasta encontrar h3/h4.
    var node = table;
    while (node) {
      var sib = node.previousElementSibling;
      while (sib) {
        var ht = sib.querySelector ? sib.querySelector("h3, h4") : null;
        if (sib.tagName === "H3" || sib.tagName === "H4") return clean(sib.textContent);
        if (ht) return clean(ht.textContent);
        sib = sib.previousElementSibling;
      }
      node = node.parentElement;
    }
    return null;
  };
  document.querySelectorAll("table").forEach(function (table) {
    var rows = extractTable(table);
    if (!rows.length) return;
    var group = findPrevHeading(table) || "Especificaciones";
    // Merge si el último grupo tiene el mismo nombre.
    var last = specs[specs.length - 1];
    if (last && last.group === group) {
      for (var i = 0; i < rows.length; i++) last.rows.push(rows[i]);
    } else {
      specs.push({ group: group, rows: rows });
    }
  });

  // Sistema
  var allHeadings = Array.from(document.querySelectorAll("h2, h3"));
  var systemHeading = allHeadings.find(function (h) {
    return /sistema de productos|ver todo el sistema/i.test(h.textContent || "");
  });
  var system = [];
  if (systemHeading) {
    var sysSection = systemHeading.closest("section") || systemHeading.parentElement;
    if (sysSection) {
      sysSection.querySelectorAll("a[href*='/Products/']").forEach(function (a) {
        var name = clean(a.innerText);
        if (!name) return;
        var img = a.querySelector("img");
        system.push({
          name: name,
          href: a.getAttribute("href"),
          imageSrc: img ? img.getAttribute("src") : null
        });
      });
    }
  }

  // Descargas
  var downloads = [];
  var downloadSection = document.querySelector("#DownloadSection");
  if (downloadSection) {
    downloadSection.querySelectorAll("a[href]").forEach(function (a) {
      var href = a.getAttribute("href") || "";
      if (!href || href.charAt(0) === "#") return;
      var typeMatch = href.match(/\\.(pdf|docx?|xlsx?)/i);
      downloads.push({
        label: clean(a.innerText) || href.split("/").pop() || "Documento",
        href: href,
        type: typeMatch ? typeMatch[1].toLowerCase() : null
      });
    });
  }

  // Productos similares
  var similarHeading = allHeadings.find(function (h) {
    return /productos similares/i.test(h.textContent || "");
  });
  var similar = [];
  if (similarHeading) {
    var similarSection = similarHeading.closest("section") || similarHeading.parentElement;
    if (similarSection) {
      similarSection.querySelectorAll("a[href*='/Products/']").forEach(function (a) {
        var href = a.getAttribute("href") || "";
        var slugMatch = href.match(/\\/Products\\/([^/?#]+)/i);
        var img = a.querySelector("img");
        similar.push({
          name: clean(a.innerText) || (slugMatch ? slugMatch[1].toLowerCase() : "Producto"),
          slug: slugMatch ? slugMatch[1].toLowerCase() : null,
          href: href,
          imageSrc: img ? img.getAttribute("src") : null
        });
      });
    }
  }

  return {
    overview: overviewParas ? { text: overviewParas, htmlSummary: overviewText } : null,
    specifications: specs,
    system: system,
    downloads: downloads,
    similar: similar,
    raw: { titlesFound: allHeadings.slice(0, 20).map(function (h) { return clean(h.textContent); }) }
  };
})()`;

async function main() {
  await ensureDir(OUT_DIR);
  const args = new Set(process.argv.slice(2));
  const onlyMatch = process.argv.find((a) => a.startsWith("--only="));
  const slugMatch = process.argv.find((a) => a.startsWith("--slug="));
  const only = onlyMatch ? parseInt(onlyMatch.split("=")[1], 10) : null;
  const targetSlug = slugMatch ? slugMatch.split("=")[1] : null;

  const productsJson = await fs.readFile(
    path.join(process.cwd(), "scraped", "products.json"),
    "utf-8",
  );
  let products = JSON.parse(productsJson) as AggregatedProduct[];
  if (targetSlug) {
    products = products.filter((p) => p.slug === targetSlug);
  } else if (only && only > 0) {
    products = products.slice(0, only);
  }

  console.log(`[scrape] ${products.length} productos a procesar`);

  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    locale: "es-AR",
    viewport: { width: 1280, height: 900 },
  });
  // Warm up: visitar el home para que las cookies de Drager se asienten.
  const warmup = await ctx.newPage();
  await warmup.goto("https://www.draeger.com/es_csa/Home", { timeout: 30_000 }).catch(() => {});
  await warmup.close();

  const page = await ctx.newPage();
  let ok = 0, fail = 0, skipped = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    if (!p.href || !p.slug) {
      skipped++;
      continue;
    }
    const url = p.href.startsWith("http")
      ? p.href.replace(/#.*/, "")
      : DRAEGER_BASE + p.href.replace(/#.*/, "");

    try {
      const data = await scrapeOne(page, url);
      const detail: ScrapedDetail = {
        slug: p.slug,
        url,
        scrapedAt: new Date().toISOString(),
        ...data,
      };
      await fs.writeFile(
        path.join(OUT_DIR, `${p.slug}.json`),
        JSON.stringify(detail, null, 2),
        "utf-8",
      );
      ok++;
      console.log(
        `[scrape] ${i + 1}/${products.length} ✓ ${p.slug} (specs=${detail.specifications.length}, sys=${detail.system.length}, dl=${detail.downloads.length}, sim=${detail.similar.length})`,
      );
    } catch (e: any) {
      fail++;
      console.warn(`[scrape] ${i + 1}/${products.length} ✗ ${p.slug}: ${e.message}`);
    }
  }

  await browser.close();
  console.log(`\n[done] ok=${ok} fail=${fail} skipped=${skipped} → ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
