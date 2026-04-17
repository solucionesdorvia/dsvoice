/**
 * Integrated scraper that visits each Dräger VOICE substance page,
 * clicks through every data tab (Detalles / H,P,EUH / Información química),
 * extracts the structured information and writes it as a JSON file.
 *
 * Strategy:
 *   - Single worker (to stay under Akamai rate-limits).
 *   - Every N successful requests the browser context is destroyed and a
 *     brand-new one created; this rotates cookies & fingerprint data, which
 *     dramatically reduces false "Access Denied" responses.
 *   - When a WAF block is detected mid-run, the context is reset immediately
 *     and we sleep 2-6 minutes (exponential) before retrying.
 *
 * Writes:
 *   scraped/substances/{id}.json             - structured data
 *   scraped/substances/{id}.404              - 404 sentinel
 *   scraped/substances/{id}.fail             - persistent failure sentinel
 *
 * Usage:
 *   npx tsx scripts/scrape/scrape-substance.ts --from 1 --to 2000 \
 *     --delayMs 600 --rotateEvery 150
 */
import { chromium, Browser, BrowserContext, Page } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

type Args = {
  from: number;
  to: number;
  outDir: string;
  retries: number;
  delayMs: number;
  rotateEvery: number;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (n: string, d: string) => {
    const i = argv.indexOf(`--${n}`);
    return i >= 0 ? argv[i + 1] : d;
  };
  return {
    from: parseInt(get("from", "1"), 10),
    to: parseInt(get("to", "2000"), 10),
    outDir: get("outDir", "scraped/substances"),
    retries: parseInt(get("retries", "4"), 10),
    delayMs: parseInt(get("delayMs", "600"), 10),
    rotateEvery: parseInt(get("rotateEvery", "150"), 10),
  };
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export interface ProductCard {
  name: string;
  tagline: string | null;
  features: string[];
  image: string | null;
  href: string | null;
}

export interface ProductCategory {
  categoryGroup: string;
  category: string;
  products: ProductCard[];
}

export interface HazardStatement {
  code: string;
  text: string;
}

export interface ChemicalInfo {
  decompositionTempC?: number | null;
  meltingPointC?: number | null;
  boilingPointC?: number | null;
  densityGCm3?: number | null;
  ionizationEv?: number | null;
  flashPointC?: number | null;
  ignitionTempC?: number | null;
  vaporPressureHPa?: number | null;
  lelVolPct?: number | null;
  uelVolPct?: number | null;
  molarMassGMol?: number | null;
  raw: Record<string, string>;
}

export interface SubstanceData {
  id: number;
  url: string;
  name: string;
  formula: string | null;
  casNumber: string | null;
  unNumber: string | null;
  ecNumber: string | null;
  hazardIdNumber: string | null;
  ghsPictograms: string[];
  hazardStatements: HazardStatement[];
  chemical: ChemicalInfo;
  productCategories: ProductCategory[];
  scrapedAt: string;
}

function parseNumeric(v: string): number | null {
  if (!v) return null;
  const cleaned = v.replace(/,/g, ".").trim();
  const m = cleaned.match(/[-+]?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

const UA_POOL = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
];
function pickUA(): string {
  return UA_POOL[Math.floor(Math.random() * UA_POOL.length)];
}

async function buildContext(browser: Browser): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({
    userAgent: pickUA(),
    locale: "es-ES",
    viewport: { width: 1440 + Math.floor(Math.random() * 200), height: 900 },
    extraHTTPHeaders: {
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    },
  });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  await ctx.route("**/*", (route) => {
    const u = route.request().url();
    if (u.startsWith("https://www.draeger.com/") || u.startsWith("https://draeger.com/")) {
      const t = route.request().resourceType();
      if (t === "image" || t === "media" || t === "font") return route.abort();
      return route.continue();
    }
    return route.abort();
  });

  // Warm-up: visit home once so Akamai cookies are set.
  const page = await ctx.newPage();
  try {
    await page.goto("https://www.draeger.com/es_csa/Home", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForTimeout(800);
  } catch (err) {
    console.warn("[warmup]", String(err));
  }
  return { ctx, page };
}

async function scrapeOne(page: Page, id: number): Promise<SubstanceData | "404"> {
  const url = `https://www.draeger.com/es_csa/Substances/${id}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  const title = await page.title();
  if (title.trim() === "Error 404") return "404";

  await page.waitForTimeout(400);

  const header = (await page.evaluate(`(() => {
    const h1 = document.querySelector("main h1") || document.querySelector("h1");
    return h1 ? (h1.textContent || "").trim() : "";
  })()`)) as string;

  if (/Access Denied/i.test(title) || /^Access\s+Denied/i.test(header)) {
    throw new Error("WAF_BLOCK");
  }
  if (!header) {
    throw new Error("EMPTY_HEADER");
  }

  const clickTabByText = async (rx: RegExp) => {
    const locator = page.locator('[role="tab"]', { hasText: rx });
    if ((await locator.count()) === 0) return false;
    await locator.first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(350);
    return true;
  };

  await clickTabByText(/^Detalles$/);
  const details = (await page.evaluate(`(() => {
    const panel = document.querySelector('[role="tabpanel"]:not([hidden])');
    function getField(label) {
      if (!panel) return null;
      const nodes = panel.querySelectorAll("*");
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const t = (n.textContent || "").trim();
        if (t === label || t.replace(/\\s+/g, " ") === label) {
          const parent = n.parentElement;
          if (parent) {
            const children = Array.prototype.slice.call(parent.children);
            const idx = children.indexOf(n);
            for (let j = idx + 1; j < children.length; j++) {
              const val = (children[j].textContent || "").trim();
              if (val) return val;
            }
          }
          const next = n.nextElementSibling;
          if (next && (next.textContent || "").trim()) return (next.textContent || "").trim();
        }
      }
      return null;
    }
    const casNumber = getField("N.º CAS:");
    const unNumber = getField("N.º UN:");
    const ecNumber = getField("N.º EC:");
    const hazardIdNumber = getField("Número de identificación de peligro:");
    const elements = panel ? panel.querySelectorAll("span,div,p") : [];
    const ghsCodes = [];
    for (let i = 0; i < elements.length; i++) {
      const t = (elements[i].textContent || "").trim();
      if (/^GHS0[0-9]$/.test(t)) ghsCodes.push(t);
    }
    const uniqueGhs = Array.from(new Set(ghsCodes));
    return { casNumber, unNumber, ecNumber, hazardIdNumber, ghsPictograms: uniqueGhs };
  })()`)) as {
    casNumber: string | null;
    unNumber: string | null;
    ecNumber: string | null;
    hazardIdNumber: string | null;
    ghsPictograms: string[];
  };

  await clickTabByText(/H.*EUH|Cl[aá]usulas/i);
  await page.waitForTimeout(200);
  const hazardStatements = (await page.evaluate(`(() => {
    const panel = document.querySelector('[role="tabpanel"]:not([hidden])');
    if (!panel) return [];
    const text = panel.innerText || "";
    const lines = text.split("\\n").map(l => l.trim()).filter(Boolean);
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^(H|P|EUH)\\s*:?\\s*([0-9]{3}(?:[a-z])?(?:\\s*\\+\\s*[HP]\\d{3}(?:[a-z])?)*)\\s*$/);
      if (!m) continue;
      const kind = m[1].toUpperCase();
      const codeNum = m[2].replace(/\\s+/g, "");
      const code = (kind === "EUH" ? "EUH" : kind) + codeNum;
      const nextLine = lines[i + 1];
      if (!nextLine || /^(H|P|EUH)\\s*:?\\s*[0-9]{3}/.test(nextLine) || /^\\*Fuente/.test(nextLine)) continue;
      out.push({ code: code, text: nextLine });
    }
    return out;
  })()`)) as HazardStatement[];

  await clickTabByText(/Informaci[oó]n qu[ií]mica/i);
  await page.waitForTimeout(200);
  const chemicalRaw = (await page.evaluate(`(() => {
    const panel = document.querySelector('[role="tabpanel"]:not([hidden])');
    if (!panel) return {};
    const result = {};
    const all = panel.querySelectorAll("*");
    for (let i = 0; i < all.length; i++) {
      const el = all[i];
      const txt = (el.textContent || "").trim();
      if (!txt.endsWith(":")) continue;
      if (!/[A-Za-zÁÉÍÓÚáéíóúñÑ]/.test(txt)) continue;
      if (txt.length > 120) continue;
      let val = "";
      const next = el.nextElementSibling;
      if (next) {
        const nt = (next.textContent || "").trim();
        if (nt && nt.length < 80) val = nt;
      }
      if (!val) {
        const parent = el.parentElement;
        if (parent) {
          const children = Array.prototype.slice.call(parent.children);
          const idx = children.indexOf(el);
          for (let j = idx + 1; j < children.length; j++) {
            const v = (children[j].textContent || "").trim();
            if (v && v.length < 80) { val = v; break; }
          }
        }
      }
      if (val && !result[txt]) result[txt] = val;
    }
    return result;
  })()`)) as Record<string, string>;

  const chem: ChemicalInfo = {
    raw: chemicalRaw,
    meltingPointC: parseNumeric(chemicalRaw["Punto de fusión:"] ?? ""),
    boilingPointC: parseNumeric(chemicalRaw["Punto de ebullición:"] ?? ""),
    densityGCm3: parseNumeric(
      chemicalRaw["Densidad (a 20 °C, si no se indica lo contrario):"] ??
        chemicalRaw["Densidad:"] ??
        "",
    ),
    ionizationEv: parseNumeric(chemicalRaw["Ionización:"] ?? ""),
    flashPointC: parseNumeric(chemicalRaw["Punto de inflamación:"] ?? ""),
    ignitionTempC: parseNumeric(chemicalRaw["Temperatura de ignición:"] ?? ""),
    vaporPressureHPa: parseNumeric(
      chemicalRaw["Presión de vapor (a 20 °C, si no se indica lo contrario):"] ??
        chemicalRaw["Presión de vapor:"] ??
        "",
    ),
    lelVolPct: parseNumeric(chemicalRaw["Límite inferior de explosividad:"] ?? ""),
    uelVolPct: parseNumeric(chemicalRaw["Límite superior de explosividad:"] ?? ""),
    decompositionTempC: parseNumeric(chemicalRaw["Temperatura de descomposición:"] ?? ""),
    molarMassGMol: parseNumeric(chemicalRaw["Masa molar:"] ?? chemicalRaw["Masa molecular:"] ?? ""),
  };

  const productCategories = (await page.evaluate(`(() => {
    const h2s = Array.prototype.slice.call(document.querySelectorAll("h2"));
    let productsH2 = null;
    for (let i = 0; i < h2s.length; i++) {
      if (/Productos adecuados/i.test(h2s[i].textContent || "")) { productsH2 = h2s[i]; break; }
    }
    if (!productsH2) return [];
    let root = productsH2.parentElement;
    while (root && !root.querySelector('[role="tablist"]')) root = root.parentElement;
    if (!root) root = productsH2.parentElement;
    if (!root) return [];
    const cats = [];
    function groupName(el) {
      let cur = el;
      while (cur) {
        const tab = cur.closest('[role="tablist"]');
        if (tab) {
          const selected = tab.querySelector('[role="tab"][aria-selected="true"]');
          if (selected) return (selected.textContent || "").trim();
        }
        cur = cur.parentElement;
      }
      return "";
    }
    const h3s = root.querySelectorAll("h3");
    for (let i = 0; i < h3s.length; i++) {
      const h3 = h3s[i];
      const catName = (h3.textContent || "").trim();
      if (!catName) continue;
      const container = h3.parentElement;
      if (!container) continue;
      const products = [];
      const h4s = container.querySelectorAll("h4");
      for (let j = 0; j < h4s.length; j++) {
        const h4 = h4s[j];
        const name = (h4.textContent || "").trim();
        if (!name) continue;
        let card = h4.parentElement;
        for (let k = 0; k < 6; k++) {
          if (!card) break;
          if (card.querySelector && card.querySelector("img") && card.querySelector("ul")) break;
          card = card.parentElement;
        }
        if (!card) card = h4.parentElement;
        const img = card ? card.querySelector("img") : null;
        const featureEls = card ? card.querySelectorAll("ul li") : [];
        const features = [];
        for (let k = 0; k < featureEls.length; k++) {
          const t = (featureEls[k].textContent || "").trim();
          if (t.length > 2) features.push(t);
        }
        const linkEl = (card && card.closest("a")) || (card && card.querySelector("a"));
        const href = linkEl ? linkEl.getAttribute("href") : null;
        let tagline = null;
        const nxt = h4.nextElementSibling;
        if (nxt && nxt.tagName === "P") tagline = (nxt.textContent || "").trim();
        products.push({
          name: name,
          tagline: tagline,
          features: features,
          image: img ? img.getAttribute("src") : null,
          href: href,
        });
      }
      if (products.length > 0) cats.push({ categoryGroup: groupName(h3), category: catName, products: products });
    }
    return cats;
  })()`)) as ProductCategory[];

  const m = header.match(/^(.+?)\s+([A-Z][A-Za-z0-9()·\-\.]*)\s*$/);
  let name = header;
  let formula: string | null = null;
  if (m) {
    name = m[1].trim();
    formula = m[2].trim();
  }

  return {
    id,
    url,
    name,
    formula,
    casNumber: details.casNumber,
    unNumber: details.unNumber,
    ecNumber: details.ecNumber,
    hazardIdNumber: details.hazardIdNumber,
    ghsPictograms: details.ghsPictograms,
    hazardStatements,
    chemical: chem,
    productCategories,
    scrapedAt: new Date().toISOString(),
  };
}

async function main() {
  const args = parseArgs();
  await fs.mkdir(args.outDir, { recursive: true });

  const allIds = Array.from({ length: args.to - args.from + 1 }, (_, i) => args.from + i);
  const todoIds: number[] = [];
  for (const id of allIds) {
    if (
      !(await exists(path.join(args.outDir, `${id}.json`))) &&
      !(await exists(path.join(args.outDir, `${id}.404`))) &&
      !(await exists(path.join(args.outDir, `${id}.fail`)))
    )
      todoIds.push(id);
  }
  console.log(
    `[scrape] range=${args.from}..${args.to} pending=${todoIds.length} (already=${allIds.length - todoIds.length}) rotateEvery=${args.rotateEvery} delayMs=${args.delayMs}`,
  );
  if (todoIds.length === 0) return;

  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
    args: ["--disable-blink-features=AutomationControlled"],
  });

  let { ctx, page } = await buildContext(browser);
  let sinceRotate = 0;
  let consecutiveWaf = 0;

  const progress = {
    done: 0,
    total: todoIds.length,
    ok: 0,
    notFound: 0,
    errors: 0,
    start: Date.now(),
  };

  async function rotateContext(reason: string) {
    console.log(`[rotate] ${reason}`);
    try {
      await page.close();
    } catch {}
    try {
      await ctx.close();
    } catch {}
    // Brief gap to make sure Playwright released the handles.
    await new Promise((r) => setTimeout(r, 1000));
    const next = await buildContext(browser);
    ctx = next.ctx;
    page = next.page;
    sinceRotate = 0;
  }

  for (const id of todoIds) {
    const jsonPath = path.join(args.outDir, `${id}.json`);
    const nfPath = path.join(args.outDir, `${id}.404`);
    const failPath = path.join(args.outDir, `${id}.fail`);

    if (args.delayMs > 0) {
      const jitter = args.delayMs + Math.floor(Math.random() * args.delayMs);
      await new Promise((r) => setTimeout(r, jitter));
    }

    let lastErr: unknown;
    let saved = false;
    for (let attempt = 0; attempt <= args.retries; attempt++) {
      try {
        const res = await scrapeOne(page, id);
        if (res === "404") {
          await fs.writeFile(nfPath, "");
          progress.notFound++;
          saved = true;
          consecutiveWaf = 0;
          break;
        }
        await fs.writeFile(jsonPath, JSON.stringify(res, null, 2), "utf8");
        progress.ok++;
        saved = true;
        sinceRotate++;
        consecutiveWaf = 0;
        break;
      } catch (err) {
        lastErr = err;
        const msg = String(err);
        if (/WAF_BLOCK/.test(msg) || /net::ERR/i.test(msg)) {
          consecutiveWaf++;
          // Rotate context and sleep with escalating backoff.
          const sleep = Math.min(60_000 + attempt * 60_000 + consecutiveWaf * 30_000, 360_000);
          console.warn(
            `[waf] id=${id} attempt=${attempt} consecutive=${consecutiveWaf} rotating+sleep ${Math.round(sleep / 1000)}s`,
          );
          await rotateContext(`waf id=${id}`);
          await new Promise((r) => setTimeout(r, sleep));
        } else {
          await new Promise((r) => setTimeout(r, 1500 + attempt * 2500));
        }
      }
    }
    if (!saved) {
      await fs.writeFile(failPath, String(lastErr ?? "unknown"));
      progress.errors++;
      console.error(`[fail] id=${id}: ${String(lastErr)}`);
    }
    progress.done++;

    if (args.rotateEvery > 0 && sinceRotate >= args.rotateEvery) {
      await rotateContext(`rotateEvery=${args.rotateEvery}`);
    }

    if (progress.done % 20 === 0) {
      const elapsed = (Date.now() - progress.start) / 1000;
      const rate = progress.done / Math.max(elapsed, 1);
      const eta = (progress.total - progress.done) / Math.max(rate, 0.01);
      console.log(
        `[progress] ${progress.done}/${progress.total} ok=${progress.ok} 404=${progress.notFound} err=${progress.errors} rate=${rate.toFixed(2)}/s eta=${(eta / 60).toFixed(1)}min`,
      );
    }
  }

  const mins = ((Date.now() - progress.start) / 60000).toFixed(2);
  console.log(
    `[scrape] done in ${mins}min ok=${progress.ok} 404=${progress.notFound} err=${progress.errors}`,
  );
  try {
    await page.close();
  } catch {}
  await ctx.close();
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
