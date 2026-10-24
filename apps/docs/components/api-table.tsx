import { readFile } from "node:fs/promises";
import path from "node:path";
import { createGenerator } from "fumadocs-typescript";
import ts from "typescript";

import { CodeBlock } from "./code-block";

import type { DocEntry } from "fumadocs-typescript";
import type { ReactNode } from "react";

type TypeRef = {
  /** File under `packages/data-griddle/src/core/types`, e.g. `grid.ts`. */
  file: string;
  /** Exported type name. */
  name: string;
};

type ApiTableProps = TypeRef & {
  /** Show only these properties. Feature pages use this to document the props they cover. */
  pick?: string[];
};

const TYPES_DIR = path.join(
  process.cwd(),
  "../../packages/data-griddle/src/core/types"
);

// One TypeScript process for the whole build. No cache: its key ignores imported files, so a
// JSDoc edit in `editing.ts` would not refresh a table generated from `column.ts`.
const generator = createGenerator({
  tsconfigPath: path.join(process.cwd(), "tsconfig.json"),
});

// `((x: T) => void) | undefined` loses `undefined` in `displayType`; drop the parens that grouped it.
function unwrapParens(type: string) {
  if (!type.startsWith("(") || !type.endsWith(")")) return type;
  let depth = 0;
  for (const char of type.slice(1, -1)) {
    if (char === "(") depth++;
    else if (char === ")" && --depth < 0) return type;
  }
  return type.slice(1, -1);
}

// Optional props are marked in the Property column, so `| undefined` is noise here.
function displayType(entry: DocEntry) {
  return entry.required
    ? entry.type
    : unwrapParens(entry.type.replace(/ \| undefined$/, ""));
}

// The library's JSDoc only uses inline code, so render backticks and leave the rest as text.
function renderInline(text: string): ReactNode[] {
  return text
    .split("`")
    .map((part, index) =>
      index % 2 === 1 ? <code key={index}>{part}</code> : part
    );
}

async function findDeclaration({ file, name }: TypeRef) {
  const filePath = path.join(TYPES_DIR, file);
  const source = ts.createSourceFile(
    filePath,
    await readFile(filePath, "utf8"),
    ts.ScriptTarget.Latest
  );
  const node = source.statements.find(
    (
      statement
    ): statement is ts.InterfaceDeclaration | ts.TypeAliasDeclaration =>
      (ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement)) &&
      statement.name.text === name
  );
  if (!node) throw new Error(`${name} is not declared in ${file}`);
  return { filePath, source, node };
}

// Object types: one flat row per property, with the library's JSDoc as descriptions. Nothing
// expands, so the page height is fixed once rendered.
export async function ApiTable({ file, name, pick }: ApiTableProps) {
  const { filePath, node } = await findDeclaration({ file, name });

  // The generator appends `type` to the file, so the alias needs a name of its own. `Pick` keeps
  // each property's declaration, so its JSDoc carries over.
  const generic = node.typeParameters?.length ? "<T>" : "";
  const alias = `${name}$Picked`;
  const keys = pick?.map((key) => JSON.stringify(key)).join(" | ");
  const [doc] = await generator.generateTypeTable(
    pick
      ? {
          path: filePath,
          name: alias,
          type: `export type ${alias}${generic} = Pick<${name}${generic}, ${keys}>;\n`,
        }
      : { path: filePath, name }
  );

  return (
    <div className="api-table not-prose">
      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>Description</th>
            <th>Type</th>
            <th>Default</th>
          </tr>
        </thead>
        <tbody>
          {doc.entries.map((entry) => {
            const defaultValue = entry.tags.find(
              (tag) => tag.name === "default" || tag.name === "defaultValue"
            )?.text;
            return (
              <tr key={entry.name}>
                <td className="api-table-name">
                  {entry.name}
                  {entry.required && (
                    <span className="api-table-required">required</span>
                  )}
                </td>
                <td>{renderInline(entry.description)}</td>
                <td className="api-table-type">{displayType(entry)}</td>
                <td className="api-table-code">{defaultValue ?? "–"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Unions and primitive aliases, which a property table can't show. Renders the source verbatim.
export async function TypeDeclaration(props: TypeRef) {
  const { source, node } = await findDeclaration(props);
  // Start at the declaration's JSDoc, skipping file header comments above it.
  const code = source.text.slice(node.getStart(source, true), node.end);

  return <CodeBlock lang="ts" code={code} />;
}
