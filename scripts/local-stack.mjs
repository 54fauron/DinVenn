import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
const action = process.argv[2];
const cli = async (args) =>
  exec("npx", ["supabase", ...args], { maxBuffer: 20 * 1024 * 1024 });
const redact = (value) =>
  value
    .replace(/eyJ[A-Za-z0-9_.-]+/g, "[token]")
    .replace(/sb_(secret|publishable)_[A-Za-z0-9_-]+/g, "[key]")
    .replace(/postgres(?:ql)?:\/\/[^\s"]+/g, "[database-url]");
try {
  if (action === "start") {
    console.log(
      "Starter lokal Supabase native runtime. Første oppstart laster ned backend-tjenester.",
    );
    await cli([
      "start",
      "--runtime",
      "native",
      "--exclude",
      "realtime,functions,studio,analytics,pooler",
      "--eager",
      "--output-format",
      "json",
    ]);
    console.log(
      "Lokal Supabase startet. Kjør npx supabase status for lokale endepunkter.",
    );
  } else if (action === "stop") {
    await cli(["stop"]);
    console.log("Lokal Supabase stoppet.");
  } else if (action === "test") {
    const { stdout } = await cli([
      "status",
      "--env",
      "--output-format",
      "text",
    ]);
    const status = Object.fromEntries(
      stdout.split("\n").flatMap((line) => {
        const match = line.match(/^(?:export\s+)?([A-Z_]+)=(.*)$/);
        if (!match) return [];
        let value = match[2].trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        )
          value = value.slice(1, -1);
        return [[match[1], value]];
      }),
    );
    // CLI v3 structured output may wrap the legacy status payload.
    const data = status.data ?? status;
    const env = {
      ...process.env,
      SUPABASE_URL: data.API_URL,
      SUPABASE_PUBLISHABLE_KEY: data.ANON_KEY ?? data.PUBLISHABLE_KEY,
      SUPABASE_SERVICE_ROLE_KEY: data.SERVICE_ROLE_KEY ?? data.SECRET_KEY,
    };
    if (
      !env.SUPABASE_URL ||
      !env.SUPABASE_PUBLISHABLE_KEY ||
      !env.SUPABASE_SERVICE_ROLE_KEY
    )
      throw new Error(
        "Fant ikke nødvendige felter i CLI status. Tilgjengelige feltnavn: " +
          Object.keys(data).join(", "),
      );
    const { stdout: result } = await exec(
      process.execPath,
      ["--test", "tests/live.integration.mjs"],
      { env },
    );
    console.log(result);
  } else
    throw new Error("Bruk start, test eller stop. Ingen skytjenester endres.");
} catch (e) {
  console.error(redact(e.stderr || e.stdout || e.message));
  process.exitCode = 1;
}
