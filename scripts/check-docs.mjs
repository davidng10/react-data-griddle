import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";

import { docsOut, serveDocs } from "./serve-docs.mjs";

const html = readFileSync(new URL("index.html", docsOut), "utf8");
assert.equal((html.match(/role="grid"/g) ?? []).length, 1);
assert.doesNotMatch(html, /<nav|<header|<h1|<article|<pre/);
const { url, close } = await serveDocs();
const browser = await chromium.launch();
const evidence = mkdtempSync(join(tmpdir(), "data-griddle-docs-"));
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (/hydrat/i.test(m.text())) errors.push(m.text());
  });
  await page.goto(url);
  assert.equal(await page.getByRole("grid").count(), 1);
  assert.equal(
    await page.locator("body").evaluate((body) => {
      const copy = body.cloneNode(true);
      copy
        .querySelectorAll(".dgr-root, script, style, next-route-announcer")
        .forEach((el) => el.remove());
      return copy.textContent.trim();
    }),
    "",
    "no text outside the grid"
  );
  const grid = page.getByRole("grid", { name: "People example" });
  await grid.getByRole("gridcell", { name: "Ada Chen", exact: true }).click();
  await page.keyboard.press("Enter");
  await page
    .getByRole("textbox", { name: "Name, row 1" })
    .fill("Documentation edit");
  await page.keyboard.press("Enter");
  await page.getByRole("gridcell", { name: "Documentation edit" }).waitFor();
  await page.screenshot({ path: join(evidence, "home.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    ),
    "docs fit narrow viewport"
  );
  await page.screenshot({ path: join(evidence, "mobile.png"), fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    `Single-grid page, no surrounding text, hydration, editing and narrow layout passed. Screenshots: ${evidence}`
  );
} finally {
  await browser.close();
  close();
}
