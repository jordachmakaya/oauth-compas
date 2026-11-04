/**
 * @filemeta
 * type: service
 * title: Interactive setup wizard
 * description: Asks for a provider, URLs and a credentials file path, then runs the checklist, import and doctor steps in order.
 * job_ref: untracked
 * functions: [runInit, createPrompter, expandHome]
 * classes: []
 * inputs: [Prompter answers, root]
 * outputs: [exit code, .oauth-init files, UserError]
 * relations:
 *   - imports: src/commands/guide.ts
 *   - imports: src/commands/import-credentials.ts
 *   - imports: src/commands/doctor.ts
 *   - imports: src/core/errors.ts
 *   - imports: src/core/validation.ts
 *   - imports: src/providers/index.ts
 *   - calls: createChecklist
 *   - calls: importCredentials
 *   - calls: doctor
 *   - used_by: src/main.ts
 *   - tested_by: tests/unit/init.test.ts
 *   - tested_by: tests/e2e/init.test.ts
 * last_update: 2026-11-04
 */
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { createChecklist } from "./guide.js";
import { doctor } from "./doctor.js";
import { importCredentials } from "./import-credentials.js";
import { UserError } from "../core/errors.js";
import { validateUrl } from "../core/validation.js";
import { getProvider, providerIds } from "../providers/index.js";

export type Prompter = Readonly<{
  ask(question: string): Promise<string>;
  write(text: string): void;
  close(): void;
}>;

const defaultOrigin = "http://localhost:3000";

export function createPrompter(input: NodeJS.ReadableStream, output: NodeJS.WritableStream): Prompter {
  const terminal = Boolean((input as { isTTY?: boolean }).isTTY);
  const lines = createInterface(terminal ? { input, output, terminal } : { input, terminal });
  const queued: string[] = [];
  let waiting: ((line: string | undefined) => void) | undefined;
  let closed = false;
  // Piped answers can arrive before the question is asked, so lines are queued.
  lines.on("line", (line) => {
    if (waiting) { const resolve = waiting; waiting = undefined; resolve(line); } else queued.push(line);
  });
  lines.on("close", () => {
    closed = true;
    if (waiting) { const resolve = waiting; waiting = undefined; resolve(undefined); }
  });
  return {
    async ask(question) {
      output.write(question);
      const next = queued.shift();
      if (next !== undefined) return next.trim();
      const answer = closed ? undefined : await new Promise<string | undefined>((resolve) => { waiting = resolve; });
      if (answer === undefined) throw new UserError("Setup cancelled");
      return answer.trim();
    },
    write(text) { output.write(text); },
    close() { lines.close(); },
  };
}

export function expandHome(path: string): string {
  const unquoted = path.replace(/^(["'])(.*)\1$/, "$2");
  if (unquoted === "~") return homedir();
  return unquoted.startsWith("~/") || unquoted.startsWith("~\\") ? join(homedir(), unquoted.slice(2)) : unquoted;
}

async function chooseProvider(io: Prompter): Promise<string> {
  io.write("Which provider?\n");
  providerIds.forEach((id, index) => io.write(`  ${index + 1}. ${getProvider(id).label}\n`));
  for (;;) {
    const answer = (await io.ask("Enter a number: ")).toLowerCase();
    const id = providerIds[Number(answer) - 1] ?? providerIds.find((item) => item === answer);
    if (id) return id;
    io.write(`Please enter a number from 1 to ${providerIds.length}.\n`);
  }
}

async function askUntilValid(io: Prompter, question: string, fallback: string, check: (value: string) => string): Promise<string> {
  for (;;) {
    const value = (await io.ask(`${question} [${fallback}]: `)) || fallback;
    try { return check(value); }
    catch (error: unknown) {
      if (!(error instanceof UserError)) throw error;
      io.write(`${error.message}\n`);
    }
  }
}

export async function runInit(io: Prompter, root: string): Promise<number> {
  io.write("OAuth Compass setup\nYou create the app in the provider's console. This tool never asks for your secret.\n\n");
  const id = await chooseProvider(io);
  const origin = await askUntilValid(io, "Your app's URL", defaultOrigin, (value) => validateUrl(value, "origin"));
  const redirect = await askUntilValid(io, "Your OAuth callback URL", `${origin}/api/auth/callback/${id}`, (value) => {
    createChecklist(id, origin, value);
    return value;
  });
  io.write(`${createChecklist(id, origin, redirect)}\n`);
  for (;;) {
    const answer = await io.ask("Path to your credentials file, not the secret (leave empty to stop here): ");
    if (!answer) {
      io.write("Stopped. Nothing was saved. Run oauth-compass init again when your file is ready.\n");
      return 0;
    }
    try {
      const paths = await importCredentials({ provider: id, file: expandHome(answer), root, redirect });
      io.write(`\nCredentials stored locally:\n  ${paths.json}\n  ${paths.env}\nNever commit these files.\n\n`);
      break;
    } catch (error: unknown) {
      if (!(error instanceof UserError)) throw error;
      io.write(`${error.message}\n`);
    }
  }
  const report = await doctor(root, id);
  io.write(`${report.messages.join("\n")}\n\n`);
  io.write(`Next: delete your input file, then copy the values from .oauth-init/${id}.env to your server settings.\n`);
  return report.ok ? 0 : 1;
}
