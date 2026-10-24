import { source } from "@/lib/source";
import { createFromSource } from "fumadocs-core/search/server";

// Built once at export time; the client downloads this index and searches in the browser.
export const revalidate = false;
export const { staticGET: GET } = createFromSource(source, {
  language: "english",
});
