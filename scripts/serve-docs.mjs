import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { unlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";

export const docsOut = new URL("../apps/docs/out/", import.meta.url);

// Serve the docs static export (built by `pnpm build`) and prove this server is serving it.
export async function serveDocs() {
  const probe = createServer();
  await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  const url = `http://127.0.0.1:${port}`;
  const marker = new URL(`docs-${randomUUID()}.txt`, docsOut);
  writeFileSync(marker, marker.pathname);
  const server = spawn(
    "python3",
    [
      "-m",
      "http.server",
      String(port),
      "--bind",
      "127.0.0.1",
      "--directory",
      docsOut.pathname,
    ],
    { stdio: "ignore" }
  );
  const close = () => {
    server.kill();
    unlinkSync(marker);
  };
  try {
    for (let n = 0; n < 80; n++) {
      assert.equal(server.exitCode, null, "docs server must remain alive");
      try {
        if ((await fetch(url)).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.equal(
      await (await fetch(`${url}/${marker.pathname.split("/").pop()}`)).text(),
      marker.pathname,
      "this run serves the current docs export"
    );
  } catch (error) {
    close();
    throw error;
  }
  return { url, close };
}
