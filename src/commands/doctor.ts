/**
 * @filemeta
 * type: service
 * title: Doctor command
 * description: Checks .gitignore, credential file permissions and stored JSON for a provider, and returns a pass or fail DoctorReport.
 * job_ref: legacy
 * functions: [doctor]
 * classes: []
 * inputs: [root, id]
 * outputs: [DoctorReport]
 * relations:
 *   - imports: src/core/storage.ts
 *   - imports: src/providers/index.ts
 *   - reads: .oauth-init/<provider>.credentials.json
 *   - calls: checkGitignore
 *   - used_by: src/cli.ts
 *   - tested_by: tests/e2e/cli.test.ts
 * last_update: 2026-11-04
 */
import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { checkGitignore, outputPaths } from "../core/storage.js";
import { getProvider } from "../providers/index.js";
export type DoctorReport = Readonly<{ ok: boolean; messages: readonly string[] }>;
export async function doctor(root: string, id: string): Promise<DoctorReport> {
  const provider = getProvider(id);
  const messages: string[] = [];
  const paths = outputPaths(resolve(root), provider.id);
  if (!(await checkGitignore(resolve(root)))) messages.push("FAIL .gitignore is missing .oauth-init/");
  else messages.push("PASS .oauth-init/ excluded by .gitignore");
  for (const path of [paths.json, paths.env]) {
    try {
      const stat = await lstat(path);
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("not a regular file");
      if (process.platform !== "win32" && (stat.mode & 0o077) !== 0) {
        messages.push(`FAIL ${path} permissions are too open`);
      } else messages.push(`PASS ${path} exists`);
      if (path === paths.json) {
        const data = JSON.parse(await readFile(path, "utf8")) as unknown;
        provider.parseCredentials(data);
      }
    } catch { messages.push(`FAIL ${path} missing or invalid`); }
  }
  return { ok: !messages.some((message) => message.startsWith("FAIL")), messages };
}
