/**
 * @filemeta
 * type: test
 * title: Doctor and env output integration tests
 * description: Tests doctor failures on negated .gitignore and broken .env files, and shell-safe quoting of generated .env values.
 * job_ref: untracked
 * functions: [setup]
 * classes: []
 * inputs: [synthetic credentials, temp directories]
 * outputs: [node:test results]
 * relations:
 *   - imports: src/commands/doctor.ts
 *   - imports: src/core/storage.ts
 *   - imports: src/providers/index.ts
 *   - validates: doctor
 *   - validates: envContent
 * last_update: 2026-11-04
 */
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { doctor } from "../../src/commands/doctor.js";
import { checkGitignore, envContent, ensureGitignore, outputPaths, saveCredentials } from "../../src/core/storage.js";
import { getProvider } from "../../src/providers/index.js";

const credentials = (secret = "TEST_SECRET_123") => getProvider("github").parseCredentials({
  client_id: "test-id", client_secret: secret, redirect_uris: ["http://localhost:3000/cb"],
});
async function setup(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "oauth-doctor-"));
  await ensureGitignore(root);
  await saveCredentials(root, credentials());
  return root;
}

test("doctor passes on a healthy setup and reports Windows limits honestly", async () => {
  const root = await setup();
  try {
    const report = await doctor(root, "github");
    assert.equal(report.ok, true, report.messages.join("\n"));
    assert.equal(report.messages.filter((m) => m.startsWith("PASS")).length, 3);
    assert.equal(report.messages.some((m) => m.startsWith("INFO")), process.platform === "win32");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("F-11: a negated .gitignore entry fails doctor and is repaired by import", async () => {
  const root = await setup();
  try {
    await writeFile(join(root, ".gitignore"), ".oauth-init/\n!.oauth-init/\n");
    assert.equal(await checkGitignore(root), false);
    assert.equal((await doctor(root, "github")).ok, false);
    await ensureGitignore(root);
    assert.equal(await checkGitignore(root), true);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("F-12: equivalent .gitignore entries are recognised and not duplicated", async () => {
  for (const entry of [".oauth-init", "/.oauth-init/", ".oauth-init/*"]) {
    const root = await mkdtemp(join(tmpdir(), "oauth-doctor-"));
    try {
      await writeFile(join(root, ".gitignore"), `${entry}\n`);
      await ensureGitignore(root);
      assert.equal(await readFile(join(root, ".gitignore"), "utf8"), `${entry}\n`);
    } finally { await rm(root, { recursive: true, force: true }); }
  }
});

test("F-11: a corrupted .env fails doctor with a single message per file", async () => {
  const root = await setup();
  try {
    const paths = outputPaths(root, "github");
    await writeFile(paths.env, "garbage with no keys\n", { mode: 0o600 });
    const report = await doctor(root, "github");
    assert.equal(report.ok, false);
    assert.equal(report.messages.filter((m) => m.includes(paths.env)).length, 1);
    await writeFile(paths.json, "{ not json", { mode: 0o600 });
    assert.equal((await doctor(root, "github")).messages.filter((m) => m.includes(paths.json)).length, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("F-06: .env values cannot trigger shell expansion", () => {
  assert.match(envContent(credentials("plain-value")), /^GITHUB_CLIENT_SECRET="plain-value"$/m);
  for (const secret of ["a$(touch PWNED)", "a`id`", "a\\b", 'a"b']) {
    assert.ok(envContent(credentials(secret)).includes(`GITHUB_CLIENT_SECRET='${secret}'`), secret);
  }
});

test("F-06: an unrepresentable value writes nothing at all", async () => {
  const root = await mkdtemp(join(tmpdir(), "oauth-doctor-"));
  try {
    await assert.rejects(saveCredentials(root, credentials("a$b'c")), /safely/);
    assert.equal(existsSync(outputPaths(root, "github").json), false);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("F-10: core storage has no provider-specific code", async () => {
  const code = (await readFile("src/core/storage.ts", "utf8")).replace(/\/\*\*[\s\S]*?\*\//, "");
  assert.doesNotMatch(code, /google|github|linkedin/i);
});
