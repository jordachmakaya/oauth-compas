/**
 * @filemeta
 * type: service
 * title: Install agent skill command
 * description: Copies the bundled SKILL.md into .claude/skills/oauth-compass under a directory, refusing symlinks and overwrites.
 * job_ref: untracked
 * functions: [installSkill, ensureRealDirectory]
 * classes: []
 * inputs: [root, source]
 * outputs: [installed SKILL.md path, UserError]
 * relations:
 *   - imports: src/core/errors.ts
 *   - reads: skills/oauth-compass/SKILL.md
 *   - writes: .claude/skills/oauth-compass/SKILL.md
 *   - used_by: src/main.ts
 *   - tested_by: tests/integration/install-skill.test.ts
 *   - tested_by: tests/e2e/packed-install.test.ts
 * last_update: 2026-11-04
 */
import { lstat, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { UserError } from "../core/errors.js";

// dist/src/commands/ -> package root, in a clone and in the installed package.
const bundledSkill = fileURLToPath(new URL("../../../skills/oauth-compass/SKILL.md", import.meta.url));

async function ensureRealDirectory(path: string): Promise<void> {
  try {
    const stats = await lstat(path);
    if (!stats.isDirectory() || stats.isSymbolicLink()) throw new UserError(`Refusing unsafe skill path ${path}`);
  } catch (error: unknown) {
    if (error instanceof UserError) throw error;
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await mkdir(path);
  }
}

export async function installSkill(root: string, source: string = bundledSkill): Promise<string> {
  const base = resolve(root);
  try {
    if (!(await stat(base)).isDirectory()) throw new Error("not a directory");
  } catch { throw new UserError(`Output directory not found: ${base}`); }
  let content: string;
  try { content = await readFile(source, "utf8"); }
  catch { throw new UserError("Bundled skill file is missing; reinstall oauth-compass"); }
  let directory = base;
  for (const part of [".claude", "skills", "oauth-compass"]) {
    directory = join(directory, part);
    await ensureRealDirectory(directory);
  }
  const target = join(directory, "SKILL.md");
  try { await writeFile(target, content, { flag: "wx" }); }
  catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new UserError(`Refusing to overwrite ${target}`);
    throw error;
  }
  return target;
}
