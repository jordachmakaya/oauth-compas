/**
 * @filemeta
 * type: service
 * title: Doctor command
 * description: Checks .gitignore, credential file permissions, stored JSON and .env keys for a provider, and returns a DoctorReport.
 * job_ref: legacy
 * functions: [doctor, checkFile]
 * classes: []
 * inputs: [root, id]
 * outputs: [DoctorReport]
 * relations:
 *   - imports: src/core/storage.ts
 *   - imports: src/providers/index.ts
 *   - reads: .oauth-init/<provider>.credentials.json
 *   - calls: checkGitignore
 *   - used_by: src/main.ts
 *   - used_by: src/commands/init.ts
 *   - tested_by: tests/e2e/cli.test.ts
 * last_update: 2026-11-04
 */
import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { checkGitignore, envKeys, outputPaths } from "../core/storage.js";
import { getProvider } from "../providers/index.js";
export type DoctorReport = Readonly<{ ok: boolean; messages: readonly string[] }>;
async function checkFile(path: string, validate: (content: string) => void): Promise<string> {
  try {
    const stat = await lstat(path);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("not a regular file");
    if (process.platform !== "win32" && (stat.mode & 0o077) !== 0) return `FAIL ${path} permissions are too open`;
    validate(await readFile(path, "utf8"));
    return `PASS ${path} exists`;
  } catch { return `FAIL ${path} missing or invalid`; }
}
export async function doctor(root: string, id: string): Promise<DoctorReport> {
  const provider = getProvider(id);
  const base = resolve(root);
  const paths = outputPaths(base, provider.id);
  const messages = [(await checkGitignore(base)) ? "PASS .oauth-init/ excluded by .gitignore" : "FAIL .gitignore does not exclude .oauth-init/"];
  messages.push(await checkFile(paths.json, (content) => { provider.parseCredentials(JSON.parse(content) as unknown); }));
  messages.push(await checkFile(paths.env, (content) => {
    const lines = content.split(/\r?\n/);
    for (const key of envKeys(provider.id)) {
      if (!lines.some((line) => line.startsWith(`${key}=`) && line.length > key.length + 3)) throw new Error("missing key");
    }
  }));
  if (process.platform === "win32") messages.push("INFO File permissions are not checked on Windows; review NTFS ACLs separately");
  return { ok: !messages.some((message) => message.startsWith("FAIL")), messages };
}
