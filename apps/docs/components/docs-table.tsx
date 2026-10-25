import type { ComponentProps } from "react";

// The frame for every docs table, markdown and API alike, styled by `.docs-table` in docs.css.
// The box scrolls on narrow screens, so it takes focus for keyboard scrolling.
export function DocsTable(props: ComponentProps<"table">) {
  return (
    <div className="docs-table" tabIndex={0}>
      <table {...props} />
    </div>
  );
}
