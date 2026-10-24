import assert from "node:assert/strict";
import { test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 1000 } });

test("built-in editor commits a cell edit", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?s=people");
  const grid = page.getByRole("grid", { name: "People example" });
  await grid.getByRole("gridcell", { name: "Ada Chen", exact: true }).click();
  await page.keyboard.press("Enter");
  await page
    .getByRole("textbox", { name: "Name, row 1" })
    .fill("Documentation edit");
  await page.keyboard.press("Enter");
  await page.getByRole("gridcell", { name: "Documentation edit" }).waitFor();
  assert.deepEqual(errors, []);
});
