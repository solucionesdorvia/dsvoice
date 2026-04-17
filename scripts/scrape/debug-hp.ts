/**
 * One-shot debug helper that visits ONE substance, clicks the "H, P, EUH"
 * tab and dumps the raw innerText of the active panel so we can understand
 * exactly how H/P entries are laid out.
 *
 * Usage:  npx tsx scripts/scrape/debug-hp.ts 4
 */
import { chromium } from "playwright";
import fs from "node:fs/promises";

async function main() {
  const id = parseInt(process.argv[2] ?? "4", 10);
  const url = `https://www.draeger.com/es_csa/Substances/${id}`;
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    locale: "es-ES",
    extraHTTPHeaders: { "Accept-Language": "es-ES,es;q=0.9,en;q=0.8" },
  });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  const page = await ctx.newPage();
  await page.goto("https://www.draeger.com/es_csa/Home", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  // Dismiss cookie / tracking consent banners so they don't intercept clicks.
  await page
    .evaluate(`(() => {
      const el = document.querySelector('#usercentrics-root');
      if (el && el.shadowRoot) {
        const btns = el.shadowRoot.querySelectorAll('button');
        for (const b of btns) {
          const t = (b.textContent || '').toLowerCase();
          if (/aceptar|acepto|accept|denegar|rechaz|entendido/.test(t)) { b.click(); break; }
        }
      }
    })()`)
    .catch(() => {});
  await page.waitForTimeout(600);

  const tab = page.locator('[role="tab"]', { hasText: /H.*EUH|Cl[aá]usulas/i });
  console.log("[debug] tab count:", await tab.count());
  if (await tab.count()) {
    await tab.first().click({ timeout: 5000, force: true });
    await page.waitForTimeout(1200);
  }

  const panelText = await page.evaluate(`(() => {
    const out = { active: null, allPanels: [] };
    const all = document.querySelectorAll('[role="tabpanel"]');
    for (let i = 0; i < all.length; i++) {
      const p = all[i];
      const hidden = p.hasAttribute('hidden') || (p.getAttribute('aria-hidden') === 'true');
      const label = p.getAttribute('aria-labelledby');
      out.allPanels.push({
        index: i,
        hidden: hidden,
        ariaLabelledby: label,
        textSample: (p.innerText || '').slice(0, 4000),
      });
      if (!hidden) out.active = i;
    }
    return out;
  })()`);
  await fs.writeFile(`scraped/debug-hp-${id}.txt`, JSON.stringify(panelText, null, 2), "utf8");
  console.log(`[debug] wrote scraped/debug-hp-${id}.txt`);
  await ctx.close();
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
