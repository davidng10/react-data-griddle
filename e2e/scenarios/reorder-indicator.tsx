import { DataGrid } from "../../packages/data-griddle/src/index";

import type { Column, FrozenZone } from "../../packages/data-griddle/src/index";

// One-row grid whose columns come from the test (`window.fixtureColumns`, set by addInitScript).
type Row = { id: number; value: string };
export type FixtureColumn = { id: string; width: number; frozen?: FrozenZone };

declare global {
  interface Window {
    fixtureColumns: FixtureColumn[];
    lastOrder?: string[];
  }
}

export default function ReorderIndicator() {
  const columns: Column<Row>[] = window.fixtureColumns.map((c) => ({
    ...c,
    name: c.id,
    accessor: (r) => r.value,
  }));
  return (
    <div style={{ padding: "24px" }}>
      <DataGrid
        rows={[{ id: 1, value: "Value" }]}
        columns={columns}
        getRowId={(r) => r.id}
        enableRowSelection
        onColumnOrderChange={(order) => (window.lastOrder = order as string[])}
        style={
          {
            height: 240,
            width: window.fixtureColumns.reduce((sum, c) => sum + c.width, 42),
            "--dgr-reorder-indicator-color": "#ff00ff",
          } as React.CSSProperties
        }
      />
    </div>
  );
}
