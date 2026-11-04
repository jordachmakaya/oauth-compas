/**
 * @filemeta
 * type: service
 * title: Import credentials command
 * description: Reads a local JSON file, validates it with the provider adapter, and writes credential files under .oauth-init/.
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
 *   - used_by: src/cli.ts
 *   - tested_by: tests/e2e/cli.test.ts
 * last_update: 2026-11-04
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getProvider } from "../providers/index.js";
import { UserError } from "../core/errors.js";
import { ensureGitignore, saveCredentials, type OutputPaths } from "../core/storage.js";
export async function importCredentials(args: { provider: string; file: string; root: string; redirect?: string }): Promise<OutputPaths> {
  const provider = getProvider(args.provider);
  let input: unknown;
  try { input = JSON.parse(await readFile(resolve(args.file), "utf8")) as unknown; }
  catch { throw new UserError("Unable to read credentials JSON; check file path and syntax"); }
  const credentials = provider.parseCredentials(input, args.redirect);
  await ensureGitignore(resolve(args.root));
  return saveCredentials(args.root, credentials);
}
