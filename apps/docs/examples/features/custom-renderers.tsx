"use client";

import { useMemo, useState } from "react";
import { DataGrid } from "data-griddle";

import { createEmployees } from "../data";

import type { Column, HeaderRenderContext, RowId } from "data-griddle";
import type { Employee } from "../data";

type Row = Employee & { starred: boolean };

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

// Renderers fill the cell's box. Use flex to align, and `min-width: 0` so the label can shrink.
const cellLayout = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  height: "100%",
  minWidth: 0,
} as const;

const truncate = {
  minWidth: 0,
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
} as const;

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("");
}

function Header({ ctx }: { ctx: HeaderRenderContext<Row> }) {
  return (
    <span style={{ ...cellLayout, justifyContent: "space-between" }}>
      <span style={truncate}>{ctx.column.name}</span>
      <span style={{ fontWeight: 400, opacity: 0.6 }}>{ctx.width}px</span>
    </span>
  );
}

export default function CustomRenderersExample() {
  const [rows, setRows] = useState<Row[]>(() =>
    createEmployees(100).map((row) => ({ ...row, starred: false }))
  );

  // Renderers read everything from the row, so the columns never change. Cells re-render when
  // `rows` changes, not on every render of this component.
  const columns = useMemo<Column<Row>[]>(() => {
    const toggleStar = (rowId: RowId) =>
      setRows((current) =>
        current.map((row) =>
          row.id === rowId ? { ...row, starred: !row.starred } : row
        )
      );

    return [
      {
        id: "star",
        name: "Starred",
        type: "action",
        width: 48,
        accessor: (row) => row.starred,
        renderHeader: () => <span aria-hidden="true">★</span>,
        renderCell: ({ row, rowId }) => (
          <button
            type="button"
            aria-label={`Star ${row.name}`}
            aria-pressed={row.starred}
            onClick={() => toggleStar(rowId)}
            style={{ border: 0, padding: 0, background: "none" }}
          >
            {row.starred ? "★" : "☆"}
          </button>
        ),
      },
      {
        id: "name",
        name: "Name",
        width: 200,
        accessor: (row) => row.name,
        renderHeader: (ctx) => <Header ctx={ctx} />,
        renderCell: ({ value }) => (
          <span style={cellLayout}>
            <span
              aria-hidden="true"
              style={{
                flex: "none",
                width: 22,
                height: 22,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                fontSize: 10,
                fontWeight: 600,
                // Set your own line-height; inheriting the row's pushes the text off-center.
                lineHeight: 1,
                color: "#fff",
                background: "#6366f1",
              }}
            >
              {initials(String(value))}
            </span>
            <span style={truncate}>{String(value)}</span>
          </span>
        ),
      },
      {
        id: "active",
        name: "Status",
        width: 110,
        accessor: (row) => row.active,
        renderCell: ({ value }) => (
          <span style={cellLayout}>
            <span
              style={{
                padding: "0 8px",
                borderRadius: 999,
                fontSize: 12,
                lineHeight: "20px",
                color: value ? "#166534" : "#57534e",
                background: value ? "#dcfce7" : "#e7e5e4",
              }}
            >
              {value ? "Active" : "Inactive"}
            </span>
          </span>
        ),
      },
      {
        id: "salary",
        name: "Salary",
        width: 130,
        accessor: (row) => row.salary,
        renderHeader: (ctx) => <Header ctx={ctx} />,
        renderCell: ({ value }) => (
          <span style={{ ...cellLayout, justifyContent: "flex-end" }}>
            {money.format(Number(value))}
          </span>
        ),
      },
      {
        id: "role",
        name: "Role",
        accessor: (row) => row.role,
        renderCell: ({ value }) => (
          <span style={{ ...truncate, display: "block" }}>{String(value)}</span>
        ),
      },
    ];
  }, []);

  return (
    <DataGrid
      aria-label="Employees"
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      rowHeight={36}
    />
  );
}
