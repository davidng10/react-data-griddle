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
  // Resizing claims only the widened edge handles, never the rest of the header.
  await page.reload();
  await grid.getByRole("gridcell").first().waitFor();
  const header = grid.getByRole("columnheader", { name: "Name", exact: true });
  const handle = header.locator('[data-resize-handle="right"]');
  const width = () => header.evaluate((el) => el.getBoundingClientRect().width);
  const originalWidth = await width();
  let handleBox = await handle.boundingBox();
  assert(
    handleBox && handleBox.width >= 12,
    "coarse-pointer handles have a wider hit area"
  );
  const handleX = handleBox.x + handleBox.width / 2;
  const handleY = handleBox.y + handleBox.height / 2;
  await touch("touchStart", handleX, handleY);
  await touch("touchMove", handleX + 50, handleY);
  await expect(grid.locator(".dgr-resize-indicator")).toHaveCount(1);
  assert.equal(
    await width(),
    originalWidth,
    "touch movement only previews a guide"
  );
  assert.equal(await scrollTop(), 0, "resize does not pan the grid");
  await touch("touchEnd");
  await expect.poll(width).toBe(originalWidth + 50);
  await expect(grid.locator(".dgr-resize-indicator")).toHaveCount(0);
  await page.screenshot({ path: join(evidence, "touch-resize.png") });

  handleBox = await handle.boundingBox();
  assert(handleBox);
  await touch("touchStart", handleBox.x + 2, handleY);
  await touch("touchMove", handleBox.x - 40, handleY);
  await touch("touchCancel");
  await expect(grid.locator(".dgr-resize-indicator")).toHaveCount(0);
  assert.equal(
    await width(),
    originalWidth + 50,
    "interrupted resize does not commit"
  );

  await touch("touchStart", box.x + 180, handleY);
  for (let step = 1; step <= 5; step++) {
    await touch("touchMove", box.x + 180 - 20 * step, handleY);
  }
  await touch("touchEnd");
  await expect
    .poll(() => grid.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(0);
  assert.equal(
    await width(),
    originalWidth + 50,
    "ordinary header swipe scrolls without resizing"
  );

  // Browser-generated taps must open/focus an editor, without a compatibility click closing it.
  await page.reload();
  await grid.getByRole("gridcell").first().waitFor();
  const editY = box.y + 48;
  const tap = async () => {
    await touch("touchStart", x, editY);
    await touch("touchEnd");
  };
  const editor = page.getByRole("textbox", { name: "Name, row 1" });
  const scale = await page.evaluate(() => window.visualViewport?.scale);
  await tap();
  await expect(editor).toHaveCount(0);
  await tap();
  await expect(editor).toBeFocused();
  await expect(editor).toHaveValue("Ada Chen");
  // Typography stays consumer-owned, including fonts smaller than 16px.
  await expect(editor).toHaveCSS("font-size", "13px");
  const frame = page.locator(".dgr-root");
  await frame.evaluate((el) => el.style.setProperty("font-size", "20px"));
  await expect(editor).toHaveCSS("font-size", "20px");
  await frame.evaluate((el) => el.style.setProperty("font-size", "12px"));
  await expect(editor).toHaveCSS("font-size", "12px");
  await frame.evaluate((el) => el.style.removeProperty("font-size"));
  assert.equal(
    await page.evaluate(() => window.visualViewport?.scale),
    scale,
    "editing does not double-tap zoom"
  );
  await editor.fill("Ada Touch");
  await page.screenshot({ path: join(evidence, "touch-editor.png") });
  await page.getByRole("button", { name: "Save edit" }).tap();
  await expect(editor).toHaveCount(0);
  await expect(
    grid.getByRole("gridcell", { name: "Ada Touch", exact: true })
  ).toHaveCount(1);
  await tap();
  await expect(editor).toHaveCount(0);
  await tap();
  await expect(editor).toBeFocused();
  await editor.fill("Discard this");
  await page.getByRole("button", { name: "Cancel edit" }).tap();
  await expect(editor).toHaveCount(0);
  await expect(
    grid.getByRole("gridcell", { name: "Ada Touch", exact: true })
  ).toHaveCount(1);
  // Exercise real browser touch events at non-default page scales. Observing defaultPrevented
  // verifies the native guard that supplements Safari's touch-action handling.
  await page.evaluate(() => {
    window.cellTouchEnds = [];
    document.addEventListener("touchend", (event) => {
      if (event.target.closest?.(".dgr-cell"))
        window.cellTouchEnds.push(event.defaultPrevented);
    });
  });
  for (const zoom of [2, 3]) {
    await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: zoom });
    await tap();
    await expect(editor).toHaveCount(0);
    await tap();
    await expect(editor).toBeFocused();
    assert.equal(await page.evaluate(() => window.visualViewport.scale), zoom);
    await page.getByRole("button", { name: "Cancel edit" }).tap();
    await expect(editor).toHaveCount(0);
  }
  assert.deepEqual(await page.evaluate(() => window.cellTouchEnds), [
    true,
    true,
    true,
    true,
  ]);
  await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
  assert.deepEqual(errors, []);
  const desktop = await browser.newPage();
  await desktop.goto(url);
  const desktopGrid = desktop.getByRole("grid", { name: "People example" });
  await desktopGrid.getByRole("gridcell").first().waitFor();
  await desktopGrid.focus();
  await desktopGrid.press("Enter");
  await expect(desktop.getByRole("textbox")).toHaveCSS("font-size", "13px");
  await desktop.close();
  console.log(
    `Chromium touch range, native scrolling, edge-scroll cancellation, column resizing and double-tap editing passed. Screenshots: ${evidence}`
  );
} finally {
  await browser.close();
}
