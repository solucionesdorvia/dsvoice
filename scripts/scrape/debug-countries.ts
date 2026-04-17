import { chromium } from "playwright";

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

  await page.locator('[role="tab"]', { hasText: /Valores l/ }).click();
  await page.waitForTimeout(2000);

  const panelHtml = await page.evaluate(() => {
    const p = document.querySelector('[role="tabpanel"]:not([hidden])') as HTMLElement | null;
    return p?.outerHTML?.slice(0, 8000) ?? "(none)";
  });
  console.log("PANEL HTML:\n", panelHtml);

  // Options inside combobox
  const options = await page.$$eval("select option", (els) =>
    els.map((e) => ({ value: (e as HTMLOptionElement).value, label: e.textContent?.trim() })),
  );
  console.log("\n<select> OPTIONS:", JSON.stringify(options.slice(0, 50), null, 2));

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
