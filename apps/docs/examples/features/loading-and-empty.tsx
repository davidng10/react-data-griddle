"use client";

import { useState } from "react";
import { DataGrid } from "data-griddle";

import { createPeople } from "../data";

import type { Column } from "data-griddle";
import type { Person } from "../data";

const columns: Column<Person>[] = [
  { id: "name", name: "Name", accessor: (row) => row.name, width: 220 },
  { id: "role", name: "Role", accessor: (row) => row.role },
];

// Stands in for your request. The grid never fetches data itself.
const fetchPeople = (count: number) =>
  new Promise<Person[]>((resolve) =>
    setTimeout(() => resolve(createPeople(count)), 1500)
  );

export default function LoadingExample() {
  // `null` means no result yet; `[]` means the request returned no rows.
  const [data, setData] = useState<Person[] | null>(() => createPeople());
  const [isFetching, setIsFetching] = useState(false);

  const load = async (count: number, keepRows: boolean) => {
    if (!keepRows) setData(null);
    setIsFetching(true);
    setData(await fetchPeople(count));
    setIsFetching(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", gap: 8, padding: 8, fontSize: 14 }}>
        <button type="button" onClick={() => load(100, true)}>
          Refresh
        </button>
        <button type="button" onClick={() => load(100, false)}>
          Load from scratch
        </button>
        <button type="button" onClick={() => load(0, true)}>
          Load no results
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <DataGrid
          aria-label="People"
          rows={data}
          loading={isFetching}
          columns={columns}
          getRowId={(row) => row.id}
          loadingLabel="Updating people"
          emptyContent={<span>No matching people</span>}
        />
      </div>
    </div>
  );
}
