// Builds dist/index.html (every plate, tabbed) and dist/plates/<id>.html (one plate each,
// for verification). `node build.mjs --audit [--only=<id>]` also runs the geometry audit.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SKILL } from "./src/scene.mjs";
import { resolveRefs } from "./src/refs.mjs";
import { pageHtml } from "./src/shell.mjs";
import { PLATES } from "./src/plates.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const audit = process.argv.includes("--audit");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
const { kitScript } = await import(`${SKILL}/scripts/inline-kit.mjs`);
const src = (f) => readFileSync(join(HERE, "src", f), "utf8");

// Inline a module with only its exports visible, so two models' private helpers can't collide.
function scoped(file) {
  const code = src(file).replace(/^import .*$/gm, "");
  const names = [...code.matchAll(/^export (?:function|const|let) (\w+)/gm)].map((m) => m[1]);
  return `const { ${names.join(", ")} } = (() => {\n${code.replace(/^export /gm, "")}\nreturn { ${names.join(", ")} };\n})();`;
}

const built = [];
for (const plate of PLATES) {
  if (!plate.build) { built.push({ ...plate, ready: false }); continue; }
  const t0 = Date.now();
  const out = plate.build({ audit: audit && (!only || only === plate.id) });
  console.log(`${plate.id}: ${out.count} items, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  built.push({ ...plate, ready: true, svg: out.svg, data: { ...out.data, ...(plate.extra?.(out.data) || {}) } });
}

const ready = built.filter((p) => p.ready);
const script = [
  kitScript(),
  ...[...new Set(ready.flatMap((p) => p.models))].map(scoped),
  `const REFS = ${JSON.stringify(resolveRefs())};`,
  ...ready.map((p) => `const ${p.dataName} = ${JSON.stringify(p.data)};`),
  src("live/core.js"),
  src("live/pulses.js"),
  ...ready.flatMap((p) => p.live.map(src)),
  `window.__vod = { ${ready.map((p) => p.dataName).join(", ")}, translateAlong, iso }; initTheme(); initTabs();`,
].join("\n");

mkdirSync(join(HERE, "dist", "plates"), { recursive: true });
writeFileSync(join(HERE, "dist", "index.html"), pageHtml({ plates: built, script, theme: "dark" }));
for (const p of ready) {
  const solo = built.map((b) => (b.id === p.id ? b : { ...b, ready: false }));
  writeFileSync(join(HERE, "dist", "plates", `${p.id}.html`), pageHtml({ plates: solo, script, theme: "dark" }));
}
console.log(`page ${(readFileSync(join(HERE, "dist", "index.html")).length / 1024).toFixed(0)} KB`);
