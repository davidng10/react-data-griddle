import assert from "node:assert/strict";
import { expect, test } from "@playwright/test";

import type { FixtureColumn } from "../scenarios/reorder-indicator";

// Pixel checks catch a guide hidden by a frozen band's shadow: DOM visibility alone cannot.
const plain: FixtureColumn[] = [
  { id: "C0", width: 200 },
  { id: "C1", width: 200 },
];
const frozen: FixtureColumn[] = [
  { id: "L0", width: 100, frozen: "left" },
  { id: "L1", width: 100, frozen: "left" },
  ...plain,
  { id: "R0", width: 100, frozen: "right" },
  { id: "R1", width: 100, frozen: "right" },
];
const cases = [
  {
    name: "after-checkbox",
    columns: plain,
    from: "C1",
    target: "C0",
    end: false,
  },
  ...["L", "C", "R"].flatMap((zone) => [
    {
      name: `${zone}-start`,
      columns: frozen,
      from: `${zone}1`,
      target: `${zone}0`,
      end: false,
    },
    {
      name: `${zone}-end`,
      columns: frozen,
      from: `${zone}0`,
      target: `${zone}1`,
      end: true,
    },
  ]),
];

test.use({ viewport: { width: 1000, height: 400 } });

for (const scenario of cases) {
  test(`${scenario.name} guide fully visible and drop correct`, async ({
    page,
  }, testInfo) => {
    await page.addInitScript((columns) => {
      window.fixtureColumns = columns;
    }, scenario.columns);
    await page.goto("/?s=reorder-indicator");
    const grid = page.getByRole("grid");
    await grid.getByRole("gridcell").first().waitFor();
    const from = (await grid
      .getByRole("columnheader", { name: scenario.from, exact: true })
      .boundingBox())!;
    const target = (await grid
      .getByRole("columnheader", { name: scenario.target, exact: true })
      .boundingBox())!;
    const boundary = target.x + (scenario.end ? target.width : 0);
    await page.mouse.move(from.x + from.width / 2, from.y + 16);
    await page.mouse.down();
    // Keep the ghost below the header so only layering at the actual boundary is measured.
    await page.mouse.move(boundary + (scenario.end ? 10 : -10), target.y + 110);
    await expect(grid.locator(".dgr-reorder-indicator")).toHaveCount(1);
    const png = await page.screenshot({
      clip: {
        x: Math.floor(boundary) - 4,
        y: Math.floor(target.y) + 5,
        width: 8,
        height: 20,
      },
    });
    const coloredPixels = await page.evaluate(
      async (data) => {
        const image = new Image();
        image.src = data;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(
          0,
          0,
          image.width,
          image.height
        ).data;
        let count = 0;
        for (let i = 0; i < pixels.length; i += 4)
          if (pixels[i] === 255 && pixels[i + 1] === 0 && pixels[i + 2] === 255)
            count++;
        return count;
      },
      `data:image/png;base64,${png.toString("base64")}`
    );
    await page.screenshot({
      path: testInfo.outputPath(`${scenario.name}.png`),
    });
    expect
      .soft(coloredPixels, "guide pixels visible (drop indicator obscured)")
      .toBe(40);
    await page.mouse.up();
    const order = scenario.columns.map((c) => c.id);
    const sourceIndex = order.indexOf(scenario.from);
    const targetIndex = order.indexOf(scenario.target);
    [order[sourceIndex], order[targetIndex]] = [
      order[targetIndex],
      order[sourceIndex],
    ];
    assert.deepEqual(
      await page.evaluate(() => window.lastOrder),
      order,
      scenario.name
    );
  });
}
