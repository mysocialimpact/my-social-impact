// Export only the approved Cow Console methodology. Generated product copies are not editable sources.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import ts from "typescript";

const source = fileURLToPath(new URL("../app/sorp-methodology-v1.ts", import.meta.url));
const siteManifest = fileURLToPath(new URL("../app/sorp-methodology-v1.generated.json", import.meta.url));
const backend = new URL("../../sorp2026/app/lib/", import.meta.url);
const executable = fileURLToPath(new URL("sorp-methodology-v1.generated.mjs", backend));
const manifest = fileURLToPath(new URL("sorp-methodology-v1.generated.json", backend));
const localApprovedFile = process.env.COW_METHODOLOGY_FILE;
const response = localApprovedFile
  ? JSON.parse(await readFile(localApprovedFile, "utf8"))
  : await (async () => {
      const result = await fetch(process.env.COW_METHODOLOGY_URL || "https://cowconsole.theideasshed.com/api/methodology?version=1.0");
      if (!result.ok) throw new Error(`Cow Console's approved methodology export failed: HTTP ${result.status}`);
      return result.json();
    })();
const definition = response.definition || response;
if (definition.methodologyId !== "ARE_YOU_SORP_READY" || definition.methodologyVersion !== "1.0" || !Array.isArray(definition.tests) || definition.tests.length !== 19 || new Set(definition.tests.map(test => test.id)).size !== 19) {
  throw new Error("Cow Console did not provide the approved canonical V1.0 definition.");
}
if (response.contentHash && response.contentHash !== createHash("sha256").update(JSON.stringify(definition)).digest("hex")) throw new Error("The Cow Console methodology export failed its content-hash check.");
await writeFile(siteManifest, `${JSON.stringify(definition, null, 2)}\n`);
const moduleCode = ts.transpileModule(await readFile(source, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
await writeFile(executable, `// Generated from Cow Console's approved ARE_YOU_SORP_READY V1.0 record and the deterministic product scorer. Do not edit.\n${moduleCode}`);
await writeFile(manifest, `${JSON.stringify(definition, null, 2)}\n`);
console.info(`Generated Cow-owned V1.0 copies for the public site and assessment service.`);
