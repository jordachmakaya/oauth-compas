/**
 * @filemeta
 * type: service
 * title: Credential file storage
 * description: Builds output paths and .env content, writes credential files without overwriting, and updates .gitignore.
 * job_ref: legacy
 * functions: [outputPaths, envKeys, envValue, envContent, saveCredentials, checkGitignore, ensureGitignore, ensureDirectory, writeSecretFile]
 * classes: []
 * inputs: [root, OAuthCredentials]
 * outputs: [OutputPaths, .oauth-init files, .gitignore entry]
 * relations:
 *   - imports: src/core/types.ts
 *   - imports: src/core/errors.ts
 *   - writes: .oauth-init/<provider>.credentials.json
 *   - writes: .oauth-init/<provider>.env
 *   - writes: .gitignore
 *   - used_by: src/commands/doctor.ts
 *   - used_by: src/commands/import-credentials.ts
 *   - tested_by: tests/integration/storage.test.ts
 * last_update: 2026-11-04
 */
import { constants } from "node:fs";
import { access, lstat, mkdir, open, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { OAuthCredentials } from "./types.js";
import { UserError } from "./errors.js";

export type OutputPaths = Readonly<{ json: string; env: string }>;
export function outputPaths(root: string, provider: OAuthCredentials["provider"]): OutputPaths {
  const directory = join(resolve(root), ".oauth-init");
  return { json: join(directory, `${provider}.credentials.json`), env: join(directory, `${provider}.env`) };
}
export function envKeys(provider: OAuthCredentials["provider"]): readonly string[] {
  const prefix = provider.toUpperCase();
  return [`${prefix}_CLIENT_ID`, `${prefix}_CLIENT_SECRET`, `${prefix}_REDIRECT_URI`];
}
// Double quotes keep $ and backticks active when a file is sourced, so such values use single quotes.
function envValue(value: string): string {
  if (!/[$`\\"]/.test(value)) return `"${value}"`;
  if (value.includes("'")) throw new UserError("A credential contains characters that cannot be written safely to a .env file");
  return `'${value}'`;
}
export function envContent(credentials: OAuthCredentials): string {
  const values = [credentials.clientId, credentials.clientSecret, credentials.redirectUri];
  const prefix = credentials.provider.toUpperCase();
  return [...envKeys(credentials.provider).map((key, index) => `${key}=${envValue(values[index] ?? "")}`),
    ...Object.entries(credentials.extras).map(([key, value]) => `${prefix}_${key}=${envValue(value)}`), ""].join("\n");
}
async function ensureDirectory(directory: string): Promise<void> {
  try {
    const stat = await lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new UserError("Secret output directory must be a real directory");
  } catch (error: unknown) {
    if (error instanceof UserError) throw error;
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await mkdir(directory, { recursive: false, mode: 0o700 });
  }
}
async function writeSecretFile(path: string, content: string): Promise<void> {
  const file = await open(path, "wx", 0o600);
  try { await file.writeFile(content, { encoding: "utf8" }); }
  finally { await file.close(); }
}
export async function saveCredentials(root: string, data: OAuthCredentials): Promise<OutputPaths> {
  const paths = outputPaths(root, data.provider);
  const directory = resolve(root, ".oauth-init");
  await ensureDirectory(directory);
  for (const path of [paths.json, paths.env]) {
    try { await access(path, constants.F_OK); throw new UserError(`Refusing to overwrite ${path}`); }
    catch (error: unknown) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }
  const extras = Object.fromEntries(Object.entries(data.extras).map(([key, value]) => [key.toLowerCase(), value]));
  const serialized = JSON.stringify({ provider: data.provider, client_id: data.clientId,
    client_secret: data.clientSecret, redirect_uris: data.redirectUris, ...extras }, null, 2) + "\n";
  const env = envContent(data);
  await writeSecretFile(paths.json, serialized);
  try {
    await writeSecretFile(paths.env, env);
  } catch (error: unknown) {
    await rm(paths.json, { force: true });
    throw error;
  }
  return paths;
}
const ignoreEntries = new Set([".oauth-init/", ".oauth-init", "/.oauth-init/", "/.oauth-init", ".oauth-init/*"]);
export async function checkGitignore(root: string): Promise<boolean> {
  try {
    const contents = await readFile(join(root, ".gitignore"), "utf8");
    let ignored = false;
    for (const line of contents.split(/\r?\n/)) {
      const entry = line.trim();
      if (ignoreEntries.has(entry)) ignored = true;
      else if (entry.startsWith("!") && ignoreEntries.has(entry.slice(1))) ignored = false;
    }
    return ignored;
  } catch { return false; }
}
export async function ensureGitignore(root: string): Promise<void> {
  const path = join(root, ".gitignore");
  try {
    const stats = await lstat(path);
    if (!stats.isFile() || stats.isSymbolicLink()) {
      throw new UserError("Refusing unsafe .gitignore target");
    }
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (await checkGitignore(root)) return;
  try { await writeFile(path, "\n.oauth-init/\n", { flag: "a" }); }
  catch { throw new UserError("Cannot update .gitignore; add '.oauth-init/' manually before importing secrets"); }
}
