import { readFile, readdir, writeFile } from "node:fs/promises";
const files = (await readdir("supabase/migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort();
const parts = await Promise.all(
  files.map(
    async (f) =>
      `-- FILE: ${f}\n${await readFile(`supabase/migrations/${f}`, "utf8")}`,
  ),
);
await writeFile(
  "supabase/setup.sql",
  "-- GENERERT av npm run db:bundle. Kun for en TOM database.\n-- Alt kjøres i én transaksjon; feil ruller tilbake hele oppsettet.\nbegin;\n\n" +
    parts.join("\n\n") +
    "\ncommit;\n",
);
console.log(`supabase/setup.sql er klar (${files.length} migrasjoner).`);
