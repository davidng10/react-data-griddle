import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, expect } from "@playwright/test";
import { build } from "esbuild";

// Pixel checks catch a guide hidden by a frozen band's shadow: DOM visibility alone cannot.
const bundle = await build({
  stdin: {
    contents: `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { DataGrid } from './packages/data-griddle/src/index';
    const columns = window.fixtureColumns.map(c => ({...c, name: c.id, accessor: r => r.value}));
    createRoot(document.getElementById('app')).render(<DataGrid
      rows={[{id: 1, value: 'Value'}]} columns={columns} getRowId={r => r.id}
      enableRowSelection onColumnOrderChange={order => window.lastOrder = order}
      style={{height: 240, width: columns.reduce((sum, c) => sum + c.width, 42), '--dgr-reorder-indicator-color': '#ff00ff'}}
    />);
  `,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  bundle: true,
  write: false,
  outdir: "out",
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
});
const js = bundle.outputFiles.find((f) => f.path.endsWith(".js")).text;
const css = bundle.outputFiles.find((f) => f.path.endsWith(".css")).text;
const evidence = mkdtempSync(join(tmpdir(), "data-griddle-drop-guide-"));
const plain = [
  { id: "C0", width: 200 },
  { id: "C1", width: 200 },
];
const frozen = [
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
const browser = await chromium.launch();
const failures = [];
try {
  for (const scenario of cases) {
    const page = await browser.newPage({
      viewport: { width: 1000, height: 400 },
    });
    await page.setContent(
      '<body style="margin:24px"><div id="app"></div></body>'
    );
    await page.evaluate((columns) => {
      window.fixtureColumns = columns;
    }, scenario.columns);
    await page.addStyleTag({ content: css });
    await page.addScriptTag({ content: js });
    const grid = page.getByRole("grid");
    await grid.getByRole("gridcell").first().waitFor();
    const from = await grid
      .getByRole("columnheader", { name: scenario.from, exact: true })
      .boundingBox();
    const target = await grid
      .getByRole("columnheader", { name: scenario.target, exact: true })
      .boundingBox();
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
        const context = canvas.getContext("2d");
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
    await page.screenshot({ path: join(evidence, `${scenario.name}.png`) });
    if (coloredPixels !== 40)
      failures.push(
        `${scenario.name}: ${coloredPixels}/40 guide pixels visible`
      );
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
    await page.close();
  }
  assert.deepEqual(
    failures,
    [],
    `Drop indicator obscured. Screenshots: ${evidence}`
  );
  console.log(
    `All 7 checkbox/frozen boundary guides fully visible and drops correct. Screenshots: ${evidence}`
  );
} finally {
  await browser.close();
}
