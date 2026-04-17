/**
 * Debug helper: navigates to a substance page, clicks every tab in order,
 * waits for the panel content to update, and logs the distinct text we see.
 * Also saves the full HTML after each tab-switch so we can compare.
 */
import { chromium } from "playwright";
import fs from "node:fs/promises";

async function main() {
  const id = process.argv[2] ?? "4";
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    locale: "es-ES",
    viewport: { width: 1440, height: 900 },
  });
  await ctx.route("**/*", (r) =>
    r.request().url().startsWith("https://www.draeger.com/") ? r.continue() : r.abort(),
  );
  const page = await ctx.newPage();
  await page.goto(`https://www.draeger.com/es_csa/Substances/${id}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(1500);

  const tabs = await page.$$eval('[role="tab"]', (els) =>
    els.map((el) => ({ id: el.id, text: (el.textContent ?? "").trim() })),
  );
  console.log("tabs:", tabs);

  // Log requests triggered by each tab click
  const urls: string[] = [];
  page.on("request", (req) => urls.push(`${req.method()} ${req.url()}`));

  for (const t of tabs) {
    console.log(`\n--- click: ${t.text} (#${t.id}) ---`);
    urls.length = 0;
    try {
      await page.locator(`[role="tab"]#${t.id.replace(/:/g, "\\:")}`).click({ timeout: 5000 });
    } catch (err) {
      console.log(`click failed: ${String(err)}`);
      continue;
    }
    await page.waitForTimeout(2000);

    const panelText = await page.evaluate(() => {
      const active = document.querySelector('[role="tabpanel"]:not([hidden])') as HTMLElement | null;
      return active?.innerText?.slice(0, 400) ?? "(no visible tabpanel)";
    });
    console.log("visible panel text (first 400 chars):\n", panelText);
    const draegerReqs = urls.filter((u) => u.includes("draeger.com"));
    if (draegerReqs.length > 0) {
      console.log("requests during click:");
      draegerReqs.slice(0, 20).forEach((u) => console.log("  ", u));
    }

    const html = await page.content();
    await fs.writeFile(
      `scraped/substances/debug-${id}-${t.id || t.text.slice(0, 10)}.html`,
      html,
      "utf8",
    );
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
