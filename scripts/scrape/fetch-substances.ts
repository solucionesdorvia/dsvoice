/**
 * Fetches the raw HTML for every Dräger VOICE substance detail page and
 * saves it to `scraped/substances/{id}.html`.
 *
 * - Iterates substance IDs in a given range.
 * - Skips IDs that already have a saved HTML (resume-friendly).
 * - Detects 404s by the `<title>Error 404</title>` marker and saves a
 *   placeholder `{id}.404` so we don't retry them next run.
 * - Uses Playwright with a configurable pool of pages to avoid overloading
 *   Dräger's WAF (Akamai).
 *
 * Usage:
 *   npx tsx scripts/scrape/fetch-substances.ts --from 1 --to 2000 --workers 4
 */
import { chromium, Browser, BrowserContext, Page } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

type Args = {
  from: number;
  to: number;
  workers: number;
  outDir: string;
  retries: number;
};

const BASE = "https://www.draeger.com/es_csa/Substances";

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (name: string, def: string) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : def;
  };
  return {
    from: parseInt(get("from", "1"), 10),
    to: parseInt(get("to", "2000"), 10),
    workers: parseInt(get("workers", "4"), 10),
    outDir: get("outDir", "scraped/substances"),
    retries: parseInt(get("retries", "2"), 10),
  };
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function fetchOne(
  page: Page,
  id: number,
  outDir: string,
  retries: number,
): Promise<"ok" | "404" | "skipped" | "error"> {
  const htmlPath = path.join(outDir, `${id}.html`);
  const notFoundPath = path.join(outDir, `${id}.404`);
  if (await exists(htmlPath)) return "skipped";
  if (await exists(notFoundPath)) return "skipped";

  const url = `${BASE}/${id}`;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      const title = await page.title();
      if (title.trim() === "Error 404") {
        await fs.writeFile(notFoundPath, "");
        return "404";
      }
      const status = resp?.status() ?? 0;
      const html = await page.content();
      if (
        status === 403 ||
        title.trim() === "Access Denied" ||
        html.includes("Access Denied") ||
        html.length < 2000
      ) {
        lastErr = new Error(`blocked (status=${status} title="${title}" size=${html.length})`);
        await new Promise((r) => setTimeout(r, 3000 + attempt * 5000));
        continue;
      }
      await fs.writeFile(htmlPath, html, "utf8");
      return "ok";
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 1500 + attempt * 2000));
    }
  }
  console.error(`[fetch] id=${id} failed after retries: ${String(lastErr)}`);
  return "error";
}

async function worker(
  browser: Browser,
  ctx: BrowserContext,
  ids: number[],
  outDir: string,
  retries: number,
  progress: { done: number; total: number; ok: number; notFound: number; errors: number },
): Promise<void> {
  const page = await ctx.newPage();
  try {
    for (const id of ids) {
      const res = await fetchOne(page, id, outDir, retries);
      progress.done++;
      if (res === "ok") progress.ok++;
      else if (res === "404") progress.notFound++;
      else if (res === "error") progress.errors++;
      if (progress.done % 25 === 0) {
        console.log(
          `[progress] ${progress.done}/${progress.total} (ok=${progress.ok} 404=${progress.notFound} err=${progress.errors})`,
        );
      }
    }
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  const args = parseArgs();
  await ensureDir(args.outDir);

  const allIds = Array.from({ length: args.to - args.from + 1 }, (_, i) => args.from + i);
  const todoIds: number[] = [];
  for (const id of allIds) {
    const htmlPath = path.join(args.outDir, `${id}.html`);
    const nfPath = path.join(args.outDir, `${id}.404`);
    if (!(await exists(htmlPath)) && !(await exists(nfPath))) todoIds.push(id);
  }

  console.log(
    `[fetch-substances] range=${args.from}..${args.to} workers=${args.workers} pending=${todoIds.length} (already=${allIds.length - todoIds.length})`,
  );
  if (todoIds.length === 0) {
    console.log("[fetch-substances] nothing to do");
    return;
  }

  const buckets: number[][] = Array.from({ length: args.workers }, () => []);
  todoIds.forEach((id, i) => buckets[i % args.workers].push(id));

  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
    args: [
      "--disable-blink-features=AutomationControlled",
      "--disable-features=IsolateOrigins,site-per-process",
      "--no-sandbox",
    ],
  });
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    locale: "es-ES",
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-User": "?1",
      "Sec-Fetch-Dest": "document",
    },
  });
  // Remove webdriver flag to reduce detectability
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  // Warm up: visit home page first so Akamai issues us cookies.
  {
    const warm = await ctx.newPage();
    try {
      await warm.goto("https://www.draeger.com/es_csa/Home", {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      await warm.waitForTimeout(1500);
    } catch (err) {
      console.warn(`[warmup] failed: ${String(err)}`);
    } finally {
      await warm.close();
    }
  }
  // Block only third-party tracking; keep images/fonts/media loading so Akamai bot-detection
  // sees a realistic browser behavior. draeger.com assets stay allowed.
  await ctx.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith("https://www.draeger.com/") || url.startsWith("https://draeger.com/")) {
      return route.continue();
    }
    return route.abort();
  });

  const progress = { done: 0, total: todoIds.length, ok: 0, notFound: 0, errors: 0 };
  const start = Date.now();
  await Promise.all(
    buckets.map((ids) => worker(browser, ctx, ids, args.outDir, args.retries, progress)),
  );
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `[fetch-substances] done in ${elapsed}s ok=${progress.ok} 404=${progress.notFound} err=${progress.errors}`,
  );
  await ctx.close();
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
