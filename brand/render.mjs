// Renders the SVG logos + HTML brand sheet to PNG via Playwright.
// Run: `node brand/render.mjs`. Outputs PNG siblings next to the sources.

import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const targets = [
  {
    src: path.join(HERE, "rose-cosmetics-logo.svg"),
    out: path.join(HERE, "rose-cosmetics-logo.png"),
    viewport: { width: 2400, height: 960 }, // 2× the SVG viewBox
    background: "transparent",
  },
  {
    src: path.join(HERE, "rose-cosmetics-logo.svg"),
    out: path.join(HERE, "rose-cosmetics-logo-on-cream.png"),
    viewport: { width: 2400, height: 960 },
    background: "#FFF8F3",
  },
  {
    src: path.join(HERE, "rose-cosmetics-monogram.svg"),
    out: path.join(HERE, "rose-cosmetics-monogram.png"),
    viewport: { width: 1024, height: 1024 },
    background: "transparent",
  },
  {
    src: path.join(HERE, "brand-sheet.html"),
    out: path.join(HERE, "brand-sheet.png"),
    viewport: { width: 1200, height: 1700 },
    background: "#FFF8F3",
    fullPage: true,
  },
];

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
try {
  for (const t of targets) {
    const page = await browser.newPage({
      viewport: t.viewport,
      deviceScaleFactor: 1,
    });
    await page.goto("file://" + t.src, { waitUntil: "networkidle" });
    // Block until every @font-face has actually loaded and applied —
    // without this Chromium screenshots before Allura renders.
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });
    await page.waitForTimeout(300);

    await page.screenshot({
      path: t.out,
      omitBackground: t.background === "transparent",
      fullPage: t.fullPage ?? false,
    });
    console.log("✓", path.basename(t.out));
    await page.close();
  }
} finally {
  await browser.close();
}
