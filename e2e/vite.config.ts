import { resolve } from "node:path";
import { defineConfig } from "vite";

// Serves scenarios/*.tsx through one page (`/?s=<name>`), mounting the library source so browser
// tests never depend on the docs app.
export default defineConfig({
  root: import.meta.dirname,
  build: {
    outDir: resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
});
