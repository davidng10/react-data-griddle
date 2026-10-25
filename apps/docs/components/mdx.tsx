import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import defaultMdxComponents from "fumadocs-ui/mdx";

import { CODE_BACKGROUND } from "./code-block";
import { DocsTable } from "./docs-table";

import type { MDXComponents } from "mdx/types";

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    pre: (props) => (
      <CodeBlock
        {...props}
        className={`${CODE_BACKGROUND} ${props.className ?? ""}`}
      >
        <Pre>{props.children}</Pre>
      </CodeBlock>
    ),
    table: DocsTable,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
