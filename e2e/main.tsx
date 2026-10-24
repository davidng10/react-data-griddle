import { createRoot } from "react-dom/client";

import type { ComponentType } from "react";

// Every scenarios/<name>.tsx default export is reachable at /?s=<name>; no registry to update.
const scenarios = import.meta.glob<{ default: ComponentType }>(
  "./scenarios/*.tsx"
);
const name = new URLSearchParams(location.search).get("s");
const load = scenarios[`./scenarios/${name}.tsx`];
if (!load) {
  const available = Object.keys(scenarios)
    .map((path) => path.slice("./scenarios/".length, -".tsx".length))
    .join(", ");
  throw new Error(`Unknown scenario "${name}". Available: ${available}`);
}
const { default: Scenario } = await load();
createRoot(document.getElementById("app")!).render(<Scenario />);
