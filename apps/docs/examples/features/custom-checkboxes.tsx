"use client";

import { useState } from "react";
import { DataGrid } from "data-griddle";

import { createPeople } from "../data";

import type { Column, SelectionCheckboxProps } from "data-griddle";
import type { Person } from "../data";

function SelectionControl(props: SelectionCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-label={props["aria-label"]}
      aria-checked={props.indeterminate ? "mixed" : props.checked}
      aria-readonly={props.readOnly}
      disabled={props.disabled}
      onClick={props.onChange}
      style={{ width: 32, height: 32 }}
    >
      <span aria-hidden="true">
        {props.indeterminate ? "−" : props.checked ? "✓" : ""}
      </span>
    </button>
  );
}

const columns: Column<Person>[] = [
  { id: "name", name: "Name", accessor: (row) => row.name, width: 220 },
  { id: "role", name: "Role", accessor: (row) => row.role },
];

export default function CustomCheckboxesExample() {
  const [rows] = useState(() => createPeople());

  return (
    <DataGrid
      aria-label="People"
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      enableRowSelection
      // A 40px row fits the 32px control.
      rowHeight={40}
      renderSelectionCheckbox={(props) => <SelectionControl {...props} />}
    />
  );
}
