/**
 * @filemeta
 * type: test
 * title: Agent skill install integration test
 * description: Tests that installSkill copies the bundled skill, refuses overwrites and symlinks, and that its frontmatter is valid.
 * job_ref: untracked
 * functions: []
 * classes: []
 * inputs: [skills/oauth-compass/SKILL.md, temp directories]
 * outputs: [node:test results]
 * relations:
 *   - imports: src/commands/install-skill.ts
 *   - validates: installSkill
 * last_update: 2026-11-04
 */
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installSkill } from "../../src/commands/install-skill.js";

const skillPath = (root: string): string => join(root, ".claude", "skills", "oauth-compass", "SKILL.md");

test("bundled skill follows the Agent Skills format and forbids handling secrets", async () => {
  const content = await readFile("skills/oauth-compass/SKILL.md", "utf8");
  assert.ok(content.startsWith("---\n") || content.startsWith("---\r\n"));
  assert.match(content, /^name: oauth-compass\r?$/m);
  const description = /^description: (.+?)\r?$/m.exec(content)?.[1] ?? "";
  assert.ok(description.length > 0 && description.length <= 1024);
  assert.match(content, /Never ask for a secret/);
  assert.match(content, /Never automate a provider console/);
});

test("installs the skill and never overwrites it", async () => {
  const root = await mkdtemp(join(tmpdir(), "oauth-skill-"));
  try {
    assert.equal(await installSkill(root), skillPath(root));
    await writeFile(skillPath(root), "USER EDITED\n");
    await assert.rejects(installSkill(root), /Refusing to overwrite/);
    assert.equal(await readFile(skillPath(root), "utf8"), "USER EDITED\n");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("rejects a missing output directory", async () => {
  const root = await mkdtemp(join(tmpdir(), "oauth-skill-"));
  try { await assert.rejects(installSkill(join(root, "missing")), /Output directory not found/); }
  finally { await rm(root, { recursive: true, force: true }); }
});

test("refuses to write through a symlinked directory", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "oauth-skill-"));
  try {
    const elsewhere = join(root, "elsewhere");
    await mkdir(elsewhere);
    try { await symlink(elsewhere, join(root, ".claude"), "dir"); }
    catch { t.skip("creating symlinks requires extra privileges here"); return; }
    await assert.rejects(installSkill(root), /Refusing unsafe skill path/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
