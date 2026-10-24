import { readFile } from "node:fs/promises";
import path from "node:path";
import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc";

import type { ReactNode } from "react";

type DemoProps = {
  /** Path under `apps/docs/examples`, e.g. `getting-started/basic.tsx`. */
  file: string;
  /** The grid fills its parent, so the preview needs a fixed height. */
  height?: number;
  children: ReactNode;
};

// Reads the example at build time, so the source shown is the module rendered above it.
export async function Demo({ file, height = 400, children }: DemoProps) {
  const code = await readFile(
    path.join(process.cwd(), "examples", file),
    "utf8"
  );

  return (
    <figure className="not-prose bg-fd-card my-6 overflow-hidden rounded-xl border">
      <div className="p-4" style={{ height }}>
        {children}
      </div>
      <details className="group border-t">
        <summary className="text-fd-muted-foreground hover:text-fd-foreground cursor-pointer px-4 py-2 text-sm select-none">
          <span className="group-open:hidden">Show code</span>
          <span className="hidden group-open:inline">Hide code</span>
        </summary>
        <ServerCodeBlock
          lang="tsx"
          code={code.trimEnd()}
          themes={{ light: "github-light", dark: "github-dark" }}
          codeblock={{
            title: file,
            className: "rounded-none border-0 border-t",
          }}
        />
      </details>
    </figure>
  );
}
