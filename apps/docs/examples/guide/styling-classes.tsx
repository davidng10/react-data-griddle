"use client";

import { useState } from "react";
import { DataGrid } from "data-griddle";

import type { Column } from "data-griddle";

type Entry = { id: number; account: string; balance: number };

const accounts = [
  "Operating account for the Platform team's cloud infrastructure",
  "Travel",
  "Office supplies and furniture for every regional office",
  "Payroll",
  "Marketing events",
];

function createEntries(): Entry[] {
  return Array.from({ length: 40 }, (_, index) => ({
    id: index + 1,
    account: accounts[index % accounts.length],
    balance: ((index * 7919) % 20_000) - 8_000,
  }));
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const columns: Column<Entry>[] = [
  {
    id: "account",
    name: "Account name, truncated with an ellipsis",
    accessor: (row) => row.account,
    width: 260,
    cellClassName: "truncate",
    headerClassName: "truncate",
  },
  {
    id: "balance",
    name: "Balance",
    accessor: (row) => row.balance,
    renderCell: (ctx) => money.format(Number(ctx.value)),
    cellClassName: (ctx) =>
      Number(ctx.value) < 0 ? "ledger-negative" : undefined,
    headerClassName: "ledger-numeric",
  },
];

// Ship these rules in your own stylesheet. They change color and overflow, never the cell's size.
const css = `
.truncate { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.ledger-negative { color: #dc2626; font-weight: 600; }
.ledger-numeric { font-style: italic; }
`;

export default function ClassesExample() {
  const [rows] = useState(createEntries);

  return (
    <>
      <style>{css}</style>
      <DataGrid
        aria-label="Ledger"
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
      />
    </>
  );
}
