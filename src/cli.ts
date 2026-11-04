#!/usr/bin/env node
/**
 * @filemeta
 * type: script
 * title: OAuth Compass CLI entry point
 * description: Parses CLI arguments, runs the providers, guide, import or doctor command, and returns a process exit code.
 * job_ref: legacy
 * functions: [main, help, getFlag, required]
 * classes: []
 * inputs: [process.argv, --origin, --redirect, --file, --out]
 * outputs: [stdout report, stderr error message, exit code]
 * relations:
 *   - imports: src/commands/guide.ts
 *   - imports: src/commands/import-credentials.ts
 *   - imports: src/commands/doctor.ts
 *   - imports: src/providers/index.ts
 *   - calls: createGuide
 *   - calls: importCredentials
 *   - calls: doctor
 *   - tested_by: tests/e2e/cli.test.ts
 * last_update: 2026-11-04
 */
import { resolve } from "node:path";
import { createGuide } from "./commands/guide.js";
import { importCredentials } from "./commands/import-credentials.js";
import { doctor } from "./commands/doctor.js";
import { UserError } from "./core/errors.js";
import { providerIds } from "./providers/index.js";

function help(): void {
  process.stdout.write(`oauth-compass — guided OAuth credentials setup\n\nUsage:\n  oauth-compass providers\n  oauth-compass guide <google|github|linkedin> --origin URL --redirect URL\n  oauth-compass import <google|github|linkedin> --file PATH [--redirect URL] [--out DIRECTORY]\n  oauth-compass doctor <google|github|linkedin> [--out DIRECTORY]\n  oauth-compass --help\n\nSecrets are never sent to this CLI maintainer. Do not pass secrets on the command line.\n`);
}
function getFlag(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new UserError(`Missing value for ${name}`);
  return value;
}
function required(value: string | undefined, name: string): string {
  if (!value) throw new UserError(`Missing ${name}`);
  return value;
}
export async function main(args: readonly string[] = process.argv.slice(2)): Promise<number> {
  try {
    const [command, provider] = args;
    if (!command || command === "--help" || command === "-h" || command === "help") { help(); return 0; }
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
    throw new UserError(`Unknown command '${command}'`);
  } catch (error: unknown) {
    const message = error instanceof UserError ? error.message : "Unexpected error (details hidden to protect secrets)";
    process.stderr.write(`Error: ${message}\n`);
    return 1;
  }
}
if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1]).replaceAll("\\", "/")}`).href) {
  process.exitCode = await main();
}
