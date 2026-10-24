import type { Metadata } from "next";
import type { ReactNode } from "react";

import "data-griddle/styles.css";
import "./global.css";
import "./docs.css";

import { Provider } from "./provider";

export const metadata: Metadata = { title: "Data Griddle" };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
