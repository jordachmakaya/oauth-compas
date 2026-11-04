/**
 * @filemeta
 * type: service
 * title: Import credentials command
 * description: Reads a local JSON file up to 1 MiB, validates it with the provider adapter, and writes credential files under .oauth-init/.
 * job_ref: legacy
 * functions: [importCredentials]
 * classes: []
 * inputs: [provider, file, root, redirect]
 * outputs: [OutputPaths, UserError]
 * relations:
 *   - imports: src/providers/index.ts
 *   - imports: src/core/errors.ts
 *   - imports: src/core/storage.ts
 *   - calls: ensureGitignore
 *   - calls: saveCredentials
 *   - used_by: src/main.ts
 *   - used_by: src/commands/init.ts
 *   - tested_by: tests/e2e/cli.test.ts
 * last_update: 2026-11-04
 */
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { getProvider } from "../providers/index.js";
import { UserError } from "../core/errors.js";
import { ensureGitignore, saveCredentials, type OutputPaths } from "../core/storage.js";
const maxInputBytes = 1024 * 1024;
export async function importCredentials(args: { provider: string; file: string; root: string; redirect?: string }): Promise<OutputPaths> {
  const provider = getProvider(args.provider);
  const path = resolve(args.file);
  const unreadable = "Unable to read credentials JSON; check file path and syntax";
  const info = await stat(path).catch(() => { throw new UserError(unreadable); });
  if (!info.isFile()) throw new UserError("Credentials path must be a regular file");
  if (info.size > maxInputBytes) throw new UserError("Credentials file is too large (limit 1 MiB)");
  let input: unknown;
  try { input = JSON.parse(await readFile(path, "utf8")) as unknown; }
  catch { throw new UserError(unreadable); }
  const credentials = provider.parseCredentials(input, args.redirect);
  await ensureGitignore(resolve(args.root));
  return saveCredentials(args.root, credentials);
}
