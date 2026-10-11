import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../packages/data-griddle/", import.meta.url);
assert(
  existsSync(new URL("package.json", root)),
  "independent library package exists"
);
const pkg = JSON.parse(readFileSync(new URL("package.json", root)));
assert.equal(pkg.name, "data-griddle");
assert.notEqual(pkg.private, true, "library must be publishable");
assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
assert.notEqual(pkg.version, "0.0.0", "choose a release version");
for (const path of ["../package.json", "../apps/docs/package.json"]) {
  const workspace = JSON.parse(readFileSync(new URL(path, import.meta.url)));
  assert.equal(
    workspace.private,
    true,
    "workspace and app must remain private"
  );
}
assert.equal(pkg.publishConfig.registry, "https://registry.npmjs.org/");
assert.equal(pkg.publishConfig.access, "public");
assert.equal(pkg.type, "module");
assert.deepEqual(Object.keys(pkg.exports), [".", "./styles.css"]);
assert.deepEqual(pkg.sideEffects, ["**/*.css"]);
assert.deepEqual(Object.keys(pkg.dependencies), ["@tanstack/react-virtual"]);
assert.deepEqual(Object.keys(pkg.peerDependencies), ["react", "react-dom"]);
const js = readFileSync(new URL("dist/index.js", root), "utf8");
assert.match(js, /^['"]use client['"];/);
assert.match(js, /from ["']react["']/);
assert.match(js, /from ["']react\/jsx-runtime["']/);
assert.match(js, /from ["']react-dom["']/);
assert.match(js, /from ["']@tanstack\/react-virtual["']/);
assert.doesNotMatch(js, /react-router|antd|react\.production/);
const css = readFileSync(new URL("dist/styles.css", root), "utf8");
assert.match(css, /\.dgr-root/);
assert.match(css, /\.dgr-loading-layer/);
assert(existsSync(new URL("dist/index.d.ts", root)));
console.log("Package artifact contract passed");
