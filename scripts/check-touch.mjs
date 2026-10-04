import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, expect } from "@playwright/test";

// Run against the current single-grid app (pnpm dev), or pass a served production export URL.
// CDP dispatches browser touch input, unlike DOM-dispatched events which cannot prove native pan.
const url = process.argv[2] ?? "http://localhost:3000";
const evidence = mkdtempSync(join(tmpdir(), "data-griddle-touch-"));
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url);
  const grid = page.getByRole("grid", { name: "People example" });
  // Wait for hydration/virtualization, not just the server-rendered grid shell.
  await grid.getByRole("gridcell").first().waitFor();
  const box = await grid.boundingBox();
  assert(box);
  const x = box.x + 100;
  const y = box.y + 80;
  const cdp = await context.newCDPSession(page);
  const touch = (type, x, y) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints:
        type === "touchEnd" || type === "touchCancel" ? [] : [{ x, y, id: 1 }],
    });
  const scrollTop = () => grid.evaluate((el) => el.scrollTop);
  const range = grid.locator(".dgr-selection-range");

  await touch("touchStart", x, y);
  await expect(range).toHaveCount(1); // 500 ms hold timer must activate without movement.
  for (let step = 1; step <= 5; step++) {
    await touch("touchMove", x, y + 20 * step);
  }
  await expect
    .poll(() => grid.locator('[role="gridcell"][aria-selected="true"]').count())
    .toBeGreaterThan(1);
  assert.equal(
    await scrollTop(),
    0,
    "held drag selects without native panning"
  );
  await touch("touchEnd");
  await expect(range).toHaveCount(1);
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await page.screenshot({ path: join(evidence, "held-range.png") });

  await touch("touchStart", x, y + 220);
  for (let step = 1; step <= 6; step++) {
    await touch("touchMove", x, y + 220 - 25 * step);
  }
  await touch("touchEnd");
  await expect.poll(scrollTop).toBeGreaterThan(0);
  await expect(range).toHaveCount(1); // Ordinary swipe preserves the existing selection.

  // Start a fresh page to remove native scroll momentum before testing edge auto-scroll.
  await page.reload();
  await grid.getByRole("gridcell").first().waitFor();
  await touch("touchStart", x, y);
  await expect(range).toHaveCount(1);
  await touch("touchMove", x, box.y + box.height - 3);
  await expect.poll(scrollTop).toBeGreaterThan(1200);
  await touch("touchMove", x, y + 100);
  const movedInward = await scrollTop();
  await page.waitForTimeout(100);
  assert.equal(
    await scrollTop(),
    movedInward,
    "moving inward still works after the touched row is virtualized out"
  );
  await touch("touchCancel");
  const stopped = await scrollTop();
  await page.waitForTimeout(100); // Observe multiple animation frames after cancellation.
  assert.equal(
    await scrollTop(),
    stopped,
    "cancellation stops edge auto-scroll"
  );
  assert.deepEqual(errors, []);
  console.log(
    `Chromium touch hold, drag, release, native swipe and edge-scroll cancellation passed. Screenshots: ${evidence}`
  );
} finally {
  await browser.close();
}
