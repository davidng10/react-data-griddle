"use client";

import { useState } from "react";

import { Button } from "./ui/button";

import type { ReactNode } from "react";

type DemoCodeProps = {
  /** Short sources render in full with no toggle. */
  collapsible: boolean;
  children: ReactNode;
};

// Peeks the first lines of the source under a fade until expanded.
export function DemoCode({ collapsible, children }: DemoCodeProps) {
  const [expanded, setExpanded] = useState(false);
  const collapsed = collapsible && !expanded;

  return (
    <div className="relative border-t bg-(--docs-code-background)">
      <div className={collapsed ? "max-h-40 overflow-hidden" : undefined}>
        {children}
      </div>
      {collapsible && (
        <div
          className={
            collapsed
              ? "from-(--docs-code-background) absolute inset-x-0 bottom-0 flex h-24 items-end justify-center bg-linear-to-t to-transparent pb-3"
              : "flex justify-center pb-3"
          }
        >
          <Button
            variant="primary"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Collapse code" : "Expand code"}
          </Button>
        </div>
      )}
    </div>
  );
}
