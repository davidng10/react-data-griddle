import { readFile } from "node:fs/promises";
import path from "node:path";
import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc";

import { DemoCode } from "./demo-code";

import type { ReactNode } from "react";

type DemoProps = {
  /** Path under `apps/docs/examples`, e.g. `getting-started/basic.tsx`. */
  file: string;
  /** The grid fills its parent, so the preview needs a fixed height. */
  height?: number;
  children: ReactNode;
};

// Sources at or under this length render in full; longer ones peek and expand.
const PEEK_LINES = 8;

// Reads the example at build time, so the source shown is the module rendered above it.
export async function Demo({ file, height = 400, children }: DemoProps) {
  const code = (
    await readFile(path.join(process.cwd(), "examples", file), "utf8")
  ).trimEnd();

  return (
    <figure className="not-prose bg-fd-card my-6 overflow-hidden rounded-xl border">
      <div className="demo-preview" style={{ height }}>
        {children}
      </div>
      <DemoCode collapsible={code.split("\n").length > PEEK_LINES}>
        <ServerCodeBlock
          lang="tsx"
          code={code}
          themes={{ light: "github-light", dark: "github-dark" }}
          codeblock={{
            "data-line-numbers": true,
            className: "rounded-none border-0 bg-transparent",
            viewportProps: { className: "max-h-none" },
          }}
        />
      </DemoCode>
    </figure>
  );
}
