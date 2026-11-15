import { readFile } from "node:fs/promises";
import { database } from "../src/lib/db";
await database().query(
  await readFile(
    new URL("../migrations/001_initial.sql", import.meta.url),
    "utf8",
  ),
);
console.log("Director schema migration applied.");
await database().end();
