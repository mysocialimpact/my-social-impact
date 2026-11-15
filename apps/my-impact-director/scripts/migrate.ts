import { readFile, readdir } from "node:fs/promises";
import { database } from "../src/lib/db";
const directory = new URL("../migrations/", import.meta.url);
for (const file of (await readdir(directory))
  .filter((x) => /^\d+.*\.sql$/.test(x))
  .sort()) {
  await database().query(await readFile(new URL(file, directory), "utf8"));
  console.log(`Applied ${file}`);
}
await database().end();
