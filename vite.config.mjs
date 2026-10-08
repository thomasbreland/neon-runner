import { defineConfig } from "vite";

export default defineConfig({
  // index.html is the entry point: Vite parses it, bundles ./game.js
  // (and the `three` / `three/addons/*` imports it resolves from node_modules)
  // into a self-contained dist/. Defaults are all we need.
});
