// Regenerate the assessment-service manifest from the sole editable V1 methodology.
// Never edit the generated JSON by hand.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { methodologyV1 } from "../app/sorp-methodology-v1.ts";

const source = fileURLToPath(new URL("../app/sorp-methodology-v1.ts", import.meta.url));
const backend = new URL("../../sorp2026/app/lib/", import.meta.url);
const executable = fileURLToPath(new URL("sorp-methodology-v1.generated.mjs", backend));
const manifest = fileURLToPath(new URL("sorp-methodology-v1.generated.json", backend));
const moduleCode = ts.transpileModule(await readFile(source, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
await writeFile(executable, `// Generated from site/app/sorp-methodology-v1.ts. Do not edit.\n${moduleCode}`);
await writeFile(manifest, `${JSON.stringify(methodologyV1, null, 2)}\n`);
console.info(`Generated ${executable} and ${manifest}`);
if (process.env.COW_CONSOLE_DIR) {
  const cowManifest = `${process.env.COW_CONSOLE_DIR}/app/intelligence/sorp-methodology-v1.generated.json`;
  await writeFile(cowManifest, `${JSON.stringify(methodologyV1, null, 2)}\n`);
  console.info(`Generated ${cowManifest}`);
}
