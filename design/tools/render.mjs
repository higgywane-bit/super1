// Renders every board in design/mockup to design/screens/<board>.png and a static <board>.html.
// Usage: npm i -D playwright-core @fontsource/inter @fontsource/noto-sans-thai && node design/tools/render.mjs design
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const design = resolve(process.argv[2]);
const mockup = join(design, "mockup");
const screens = join(design, "screens");
mkdirSync(screens, { recursive: true });

const canvas = JSON.parse(readFileSync(join(mockup, "canvas.json"), "utf8"));
const sources = {};
for (const f of readdirSync(mockup)) if (f.endsWith(".dc.html")) sources[f.replace(/\.dc\.html$/, "")] = readFileSync(join(mockup, f), "utf8");
const blobMap = JSON.parse(readFileSync(join(mockup, "blob-map.json"), "utf8"));
// From design/screens/, assets live one folder up.
const blobs = Object.fromEntries(Object.entries(blobMap).map(([k, v]) => [k, `../${v}`]));
const runtime = readFileSync(join(here, "runtime.js"), "utf8");

const fontCss = [400, 500, 600, 700]
  .flatMap((w) => [`@fontsource/inter/${w}.css`, `@fontsource/noto-sans-thai/${w}.css`])
  .map((p) => `<link rel="stylesheet" href="${pathToFileURL(createRequire(import.meta.url).resolve(p)).href}">`)
  .join("\n");

const page = (board, fonts, extra = "") => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${board}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
${fonts}
<link rel="stylesheet" href="../mockup/s1.css">
<link rel="stylesheet" href="../mockup/ds/super1/components/bundle.css">
<style>body{margin:0;background:#000}${extra}</style>
</head><body><div id="root"></div></body></html>`;

const noMotion = "*,*::before,*::after{animation:none!important;transition:none!important}";
const googleFonts = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Thai:wght@400;500;600;700&display=swap">`;

// Set CHROMIUM_PATH to a Chrome/Chromium binary if Playwright's own browser isn't installed.
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--allow-file-access-from-files"] });
const index = [];
let failed = 0;
for (const file of canvas.order) {
  const board = file.replace(/\.dc\.html$/, "");
  const b = canvas.boards[file];
  const ctx = await browser.newContext({ viewport: { width: b.w, height: b.h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  const tmp = join(screens, `.${board}.render.html`);
  writeFileSync(tmp, page(board, fontCss, noMotion));
  await p.goto(pathToFileURL(tmp).href);
  await p.addScriptTag({ content: `window.__SOURCES=${JSON.stringify(sources)};window.__BLOBS=${JSON.stringify(blobs)};` });
  await p.addScriptTag({ content: runtime });
  try {
    await p.evaluate((name) => window.renderBoard(name), board);
  } catch (e) {
    errors.push(String(e));
  }
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(150);
  await p.screenshot({ path: join(screens, `${board}.png`) });
  // Static HTML for inspection: the rendered DOM, real fonts from Google, motion left on.
  const body = await p.evaluate(() => document.getElementById("root").innerHTML);
  writeFileSync(join(screens, `${board}.html`), page(board, googleFonts).replace('<div id="root"></div>', `<div id="root">${body}</div>`));
  await ctx.close();
  if (errors.length) { failed++; console.log(`✗ ${board}: ${errors.slice(0, 3).join(" | ")}`); }
  index.push({ board, title: b.title, page: b.page, size: `${b.w}×${b.h}` });
}
await browser.close();
// clean temp files
for (const f of readdirSync(screens)) if (f.startsWith(".") && f.endsWith(".render.html")) { const fs = await import("node:fs"); fs.unlinkSync(join(screens, f)); }
writeFileSync(join(screens, "index.json"), JSON.stringify(index, null, 1));
console.log(`rendered ${index.length} boards, ${failed} with errors`);
