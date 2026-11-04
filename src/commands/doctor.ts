/**
 * @filemeta
 * type: service
 * title: Doctor command
 * description: Checks .gitignore, file permissions, stored JSON and that the .env matches it for a provider, and returns a DoctorReport.
 * job_ref: legacy
 * functions: [doctor, checkFile, matchesStored]
 * classes: []
 * inputs: [root, id]
 * outputs: [DoctorReport]
 * relations:
 *   - imports: src/core/storage.ts
 *   - imports: src/core/types.ts
 *   - imports: src/providers/index.ts
 *   - reads: .oauth-init/<provider>.credentials.json
 *   - calls: checkGitignore
 *   - used_by: src/main.ts
 *   - used_by: src/commands/init.ts
 *   - tested_by: tests/integration/consistency.test.ts
 *   - tested_by: tests/e2e/cli.test.ts
 * last_update: 2026-11-04
 */
import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { checkGitignore, envContent, outputPaths } from "../core/storage.js";
import type { OAuthCredentials } from "../core/types.js";
import { getProvider } from "../providers/index.js";
export type DoctorReport = Readonly<{ ok: boolean; messages: readonly string[] }>;
async function checkFile(path: string, validate: (content: string) => void | Promise<void>): Promise<string> {
  try {
    const stat = await lstat(path);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("not a regular file");
    if (process.platform !== "win32" && (stat.mode & 0o077) !== 0) return `FAIL ${path} permissions are too open`;
    await validate(await readFile(path, "utf8"));
    return `PASS ${path} exists`;
  } catch { return `FAIL ${path} missing, invalid or out of sync`; }
}
// Lines are compared, never printed. Extra variables are allowed, and any stored redirect URI may be the active one.
function matchesStored(content: string, stored: OAuthCredentials): boolean {
  const lines = content.split(/\r?\n/);
  return stored.redirectUris.some((redirectUri) => envContent({ ...stored, redirectUri })
    .split("\n").filter(Boolean).every((line) => lines.includes(line)));
}
export async function doctor(root: string, id: string): Promise<DoctorReport> {
  const provider = getProvider(id);
  const base = resolve(root);
  const paths = outputPaths(base, provider.id);
  const parseStored = (content: string): OAuthCredentials => provider.parseCredentials(JSON.parse(content) as unknown);
  const messages = [(await checkGitignore(base)) ? "PASS .oauth-init/ excluded by .gitignore" : "FAIL .gitignore does not exclude .oauth-init/"];
  messages.push(await checkFile(paths.json, (content) => { parseStored(content); }));
  messages.push(await checkFile(paths.env, async (content) => {
    if (!matchesStored(content, parseStored(await readFile(paths.json, "utf8")))) throw new Error("out of sync");
  }));
  if (process.platform === "win32") messages.push("INFO File permissions are not checked on Windows; review NTFS ACLs separately");
  return { ok: !messages.some((message) => message.startsWith("FAIL")), messages };
}
