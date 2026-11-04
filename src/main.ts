/**
 * @filemeta
 * type: service
 * title: CLI command dispatcher
 * description: Parses CLI arguments, runs the init, providers, guide, import, doctor or skill command, and returns a process exit code.
 * job_ref: untracked
 * functions: [main, help, getFlag, required, checkArguments, wizard]
 * classes: []
 * inputs: [process.argv, --origin, --redirect, --file, --out]
 * outputs: [stdout report, stderr error message, exit code]
 * relations:
 *   - imports: src/commands/guide.ts
 *   - imports: src/commands/import-credentials.ts
 *   - imports: src/commands/doctor.ts
 *   - imports: src/commands/install-skill.ts
 *   - imports: src/commands/init.ts
 *   - imports: src/providers/index.ts
 *   - calls: createGuide
 *   - calls: importCredentials
 *   - calls: doctor
 *   - calls: installSkill
 *   - calls: runInit
 *   - used_by: src/cli.ts
 *   - tested_by: tests/e2e/cli.test.ts
 * last_update: 2026-11-04
 */
import { resolve } from "node:path";
import { createGuide } from "./commands/guide.js";
import { importCredentials } from "./commands/import-credentials.js";
import { doctor } from "./commands/doctor.js";
import { installSkill } from "./commands/install-skill.js";
import { createPrompter, runInit } from "./commands/init.js";
import { UserError } from "./core/errors.js";
import { providerIds } from "./providers/index.js";

function help(): void {
  const ids = providerIds.join("|");
  process.stdout.write(`oauth-compass — guided OAuth credentials setup\n\nUsage:\n  oauth-compass                     Interactive setup (same as init)\n  oauth-compass init\n  oauth-compass providers\n  oauth-compass guide <${ids}> --origin URL --redirect URL\n  oauth-compass import <${ids}> --file PATH [--redirect URL] [--out DIRECTORY]\n  oauth-compass doctor <${ids}> [--out DIRECTORY]\n  oauth-compass skill install [--out DIRECTORY]\n  oauth-compass --help\n\nThis CLI never sends your secrets anywhere. Do not pass secrets on the command line.\n`);
}
function getFlag(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new UserError(`Missing value for ${name}`);
  return value;
}
const commandRules: Readonly<Record<string, Readonly<{ options: readonly string[]; positionals: number }>>> = {
  init: { options: [], positionals: 0 },
  providers: { options: [], positionals: 0 },
  guide: { options: ["--origin", "--redirect"], positionals: 1 },
  import: { options: ["--file", "--redirect", "--out"], positionals: 1 },
  doctor: { options: ["--out"], positionals: 1 },
  skill: { options: ["--out"], positionals: 1 },
};
// Silently ignoring a mistyped option could send secrets to the wrong folder.
function checkArguments(args: readonly string[], options: readonly string[], positionals: number): void {
  const seen = new Set<string>();
  let positionalCount = 0;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? "";
    if (!arg.startsWith("-")) {
      positionalCount += 1;
      if (positionalCount > positionals) throw new UserError("Unexpected argument. Run oauth-compass --help");
      continue;
    }
    if (!options.includes(arg)) throw new UserError(`Unknown option ${arg.split("=")[0]?.replace(/[^\w-]/g, "") ?? ""}`);
    if (seen.has(arg)) throw new UserError(`Duplicate option ${arg}`);
    seen.add(arg);
    index += 1;
  }
}
async function wizard(): Promise<number> {
  const io = createPrompter(process.stdin, process.stdout);
  try { return await runInit(io, process.cwd()); }
  finally { io.close(); }
}
function required(value: string | undefined, name: string): string {
  if (!value) throw new UserError(`Missing ${name}`);
  return value;
}
export async function main(args: readonly string[] = process.argv.slice(2)): Promise<number> {
  try {
    const [command, provider] = args;
    if (!command) {
      if (process.stdin.isTTY && process.stdout.isTTY) return await wizard();
      help();
      return 0;
    }
    if (command === "help" || args.includes("--help") || args.includes("-h")) { help(); return 0; }
    const rules = commandRules[command];
    if (!rules) throw new UserError(`Unknown command '${command}'`);
    checkArguments(args.slice(1), rules.options, rules.positionals);
    if (command === "init") return await wizard();
    if (command === "providers") { process.stdout.write(`${providerIds.join("\n")}\n`); return 0; }
    if (command === "guide") {
      process.stdout.write(createGuide(required(provider, "provider"),
        required(getFlag(args, "--origin"), "--origin"),
        required(getFlag(args, "--redirect"), "--redirect")));
      return 0;
    }
    if (command === "import") {
      const input: { provider: string; file: string; root: string; redirect?: string } = {
        provider: required(provider, "provider"), file: required(getFlag(args, "--file"), "--file"),
        root: resolve(getFlag(args, "--out") ?? process.cwd()),
      };
      const redirect = getFlag(args, "--redirect");
      if (redirect) input.redirect = redirect;
      const paths = await importCredentials(input);
      process.stdout.write(`Credentials stored locally:\n  ${paths.json}\n  ${paths.env}\nNever commit these files.\n`);
      return 0;
    }
    if (command === "doctor") {
      const report = await doctor(resolve(getFlag(args, "--out") ?? process.cwd()), required(provider, "provider"));
      process.stdout.write(report.messages.join("\n") + "\n");
      return report.ok ? 0 : 1;
    }
    if (command === "skill") {
      if (provider !== "install") throw new UserError("Usage: oauth-compass skill install [--out DIRECTORY]");
      const path = await installSkill(resolve(getFlag(args, "--out") ?? process.cwd()));
      process.stdout.write(`Agent skill installed:\n  ${path}\n`);
      return 0;
    }
    throw new UserError(`Unknown command '${command}'`);
  } catch (error: unknown) {
    const message = error instanceof UserError ? error.message : "Unexpected error (details hidden to protect secrets)";
    process.stderr.write(`Error: ${message}\n`);
    return 1;
  }
}
