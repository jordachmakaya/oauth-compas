/**
 * @filemeta
 * type: service
 * title: Credential file storage
 * description: Builds output paths and .env content, writes credential files without overwriting, and updates .gitignore.
 * job_ref: legacy
 * functions: [outputPaths, envContent, saveCredentials, checkGitignore, ensureGitignore, ensureDirectory, writeSecretFile]
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

const providerKeys = { google: "GOOGLE", github: "GITHUB", linkedin: "LINKEDIN" } as const;
export type OutputPaths = Readonly<{ json: string; env: string }>;
export function outputPaths(root: string, provider: OAuthCredentials["provider"]): OutputPaths {
  const directory = join(resolve(root), ".oauth-init");
  return { json: join(directory, `${provider}.credentials.json`), env: join(directory, `${provider}.env`) };
}
export function envContent(credentials: OAuthCredentials): string {
  const key = providerKeys[credentials.provider];
  const q = (value: string): string => JSON.stringify(value);
  return [`${key}_CLIENT_ID=${q(credentials.clientId)}`,
    `${key}_CLIENT_SECRET=${q(credentials.clientSecret)}`,
    `${key}_REDIRECT_URI=${q(credentials.redirectUris[0] ?? "")}`, ""].join("\n");
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
  const serialized = JSON.stringify({ provider: data.provider, client_id: data.clientId,
    client_secret: data.clientSecret, redirect_uris: data.redirectUris }, null, 2) + "\n";
  await writeSecretFile(paths.json, serialized);
  try {
    await writeSecretFile(paths.env, envContent(data));
  } catch (error: unknown) {
    await rm(paths.json, { force: true });
    throw error;
  }
  return paths;
}
export async function checkGitignore(root: string): Promise<boolean> {
  try {
    const contents = await readFile(join(root, ".gitignore"), "utf8");
    return contents.split(/\r?\n/).some((line) => line.trim() === ".oauth-init/");
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
