import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile } from "node:fs/promises";
const { stdout } = await promisify(execFile)(
  "npx",
  ["supabase", "gen", "types", "typescript"],
  { maxBuffer: 10 * 1024 * 1024 },
);
if (!stdout.includes("export type Database"))
  throw new Error(
    "CLI returnerte ikke databasetyper. Originalfilen er beholdt.",
  );
await writeFile(
  "packages/core/src/database.types.ts",
  "// Generated from local Supabase. Regenerate with npm run db:types.\n" +
    stdout,
);
console.log("TypeScript-typer oppdatert fra lokal Supabase.");
