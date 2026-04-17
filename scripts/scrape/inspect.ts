/**
 * Quick-and-dirty inspector for a single scraped HTML.
 * Prints the parts of the DOM we care about so we can design the parser.
 */
import * as cheerio from "cheerio";
import fs from "node:fs/promises";

async function main() {
  const id = process.argv[2] ?? "4";
  const html = await fs.readFile(`scraped/substances/${id}.html`, "utf8");
  const $ = cheerio.load(html);

  console.log("=== TITLE ===");
  console.log($("title").text().trim());

  console.log("\n=== H1 ===");
  $("h1").each((_i, el) => console.log("-", $(el).text().trim().slice(0, 160)));

  console.log("\n=== H2 ===");
  $("h2").slice(0, 20).each((_i, el) => console.log("-", $(el).text().trim().slice(0, 160)));

  console.log("\n=== H3 ===");
  $("h3").slice(0, 30).each((_i, el) => console.log("-", $(el).text().trim().slice(0, 160)));

  console.log("\n=== H4 ===");
  $("h4").slice(0, 30).each((_i, el) => console.log("-", $(el).text().trim().slice(0, 160)));

  console.log("\n=== data-* attributes (distinct names) ===");
  const dataAttrs = new Set<string>();
  $("[data-component],[data-testid],[data-id],[data-cy],[data-role],[data-ghs]").each((_i, el) => {
    const attrs = (el as cheerio.TagElement).attribs ?? {};
    for (const k of Object.keys(attrs)) if (k.startsWith("data-")) dataAttrs.add(k);
  });
  console.log([...dataAttrs]);

  console.log("\n=== class-based sections (first 40 distinct) ===");
  const classes = new Map<string, number>();
  $("[class]").each((_i, el) => {
    const cls = ((el as cheerio.TagElement).attribs?.class ?? "").trim();
    if (cls) classes.set(cls, (classes.get(cls) ?? 0) + 1);
  });
  const sorted = [...classes.entries()].sort((a, b) => b[1] - a[1]);
  sorted.slice(0, 40).forEach(([c, n]) => console.log(`  ${n}x  ${c.slice(0, 180)}`));

  console.log("\n=== images with /products/ or substance in src ===");
  $("img").each((_i, el) => {
    const src = $(el).attr("src") ?? "";
    const alt = $(el).attr("alt") ?? "";
    if (src && (src.includes("/product") || alt.length > 5)) {
      console.log(`  src=${src}`);
      console.log(`  alt=${alt}`);
    }
  });

  console.log("\n=== internal links ===");
  const linkCounts = new Map<string, number>();
  $("a[href]").each((_i, el) => {
    const href = ($(el).attr("href") ?? "").split("?")[0];
    const key = href.split("/").slice(0, 4).join("/");
    linkCounts.set(key, (linkCounts.get(key) ?? 0) + 1);
  });
  [...linkCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .forEach(([k, n]) => console.log(`  ${n}x ${k}`));

  console.log("\n=== all __NEXT_DATA__ present? ===");
  const nd = $("#__NEXT_DATA__").html();
  if (nd) {
    console.log(`__NEXT_DATA__ size=${nd.length} bytes (FOUND!)`);
    const parsed = JSON.parse(nd);
    console.log("keys:", Object.keys(parsed));
    if (parsed.props) {
      console.log("props keys:", Object.keys(parsed.props));
      if (parsed.props.pageProps) {
        console.log("pageProps keys:", Object.keys(parsed.props.pageProps));
      }
    }
  } else {
    console.log("not found");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
