import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

// npm renders the packed README outside the repository, so relative links are
// pinned to the release tag that Release Please creates for this version.
const repo = "https://github.com/davidng10/react-data-griddle";
const rootReadme = new URL("../README.md", import.meta.url);
const lib = new URL("../packages/data-griddle/", import.meta.url);
const { version } = JSON.parse(readFileSync(new URL("package.json", lib)));

const readme = readFileSync(rootReadme, "utf8").replace(
  /\]\(\.\/([^)]+)\)/g,
  `](${repo}/blob/v${version}/$1)`
);
const leftover = readme.match(/\]\((?!https?:|#)[^)]*\)/g);
assert.equal(leftover, null, `Unrewritten relative links: ${leftover}`);

writeFileSync(new URL("README.md", lib), readme);
