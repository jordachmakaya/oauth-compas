/**
 * @filemeta
 * type: test
 * title: Credential consistency and input limit tests
 * description: Tests that doctor detects .env values out of sync with stored JSON, and that import limits input files.
 * job_ref: untracked
 * functions: [setup, credentialsFor]
 * classes: []
 * inputs: [synthetic credentials, temp directories]
 * outputs: [node:test results]
 * relations:
 *   - imports: src/commands/doctor.ts
 *   - imports: src/commands/import-credentials.ts
 *   - imports: src/core/storage.ts
 *   - imports: src/providers/index.ts
 *   - validates: doctor
 *   - validates: importCredentials
 * last_update: 2026-11-04
 */
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { doctor } from "../../src/commands/doctor.js";
import { importCredentials } from "../../src/commands/import-credentials.js";
import { ensureGitignore, outputPaths, saveCredentials } from "../../src/core/storage.js";
import { getProvider, providerIds } from "../../src/providers/index.js";

const uris = ["http://localhost:3000/a", "https://app.example.com/b"];
const credentialsFor = (redirect?: string) =>
  getProvider("github").parseCredentials({ client_id: "test-id", client_secret: "CONSISTENCY_SECRET", redirect_uris: uris }, redirect);
async function setup(redirect?: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "oauth-consistency-"));
  await ensureGitignore(root);
  await saveCredentials(root, credentialsFor(redirect));
  return root;
}

test("doctor fails when a .env value differs from the stored JSON, without printing it", async () => {
  const root = await setup();
  try {
    const { env } = outputPaths(root, "github");
    const content = await readFile(env, "utf8");
    await writeFile(env, content.replace("CONSISTENCY_SECRET", "WRONG_VALUE_123"));
    const report = await doctor(root, "github");
    assert.equal(report.ok, false);
    assert.doesNotMatch(report.messages.join("\n"), /WRONG_VALUE_123|CONSISTENCY_SECRET/);
    assert.ok(report.messages.some((message) => message.startsWith("FAIL") && message.includes(env)));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("doctor accepts any stored redirect URI, CRLF line endings and extra variables", async () => {
  const root = await setup("https://app.example.com/b");
  try {
    assert.equal((await doctor(root, "github")).ok, true);
    const { env } = outputPaths(root, "github");
    const content = await readFile(env, "utf8");
    await writeFile(env, `${content}MY_OTHER_SETTING=1\n`.replaceAll("\n", "\r\n"));
    assert.equal((await doctor(root, "github")).ok, true);
    await writeFile(env, content.replace("https://app.example.com/b", "https://other.example.com/c"));
    assert.equal((await doctor(root, "github")).ok, false);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("import refuses an oversized file before reading it", async () => {
  const root = await mkdtemp(join(tmpdir(), "oauth-consistency-"));
  try {
    const file = join(root, "big.json");
    await writeFile(file, JSON.stringify({ client_id: "id", client_secret: "s", redirect_uris: uris, pad: "x".repeat(2 * 1024 * 1024) }));
    await assert.rejects(importCredentials({ provider: "github", file, root }), /too large/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("import refuses a path that is not a regular file", async () => {
  const root = await mkdtemp(join(tmpdir(), "oauth-consistency-"));
  try {
    const directory = join(root, "folder.json");
    await mkdir(directory);
    await assert.rejects(importCredentials({ provider: "github", file: directory, root }), /regular file/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("provider steps never point to a path that only exists in this repository", () => {
  for (const id of providerIds) {
    for (const step of getProvider(id).steps) assert.doesNotMatch(step, /(^|\s)docs\//, `${id}: ${step}`);
  }
});

test("oversized fields get an accurate message", () => {
  assert.throws(() => getProvider("github").parseCredentials({ client_id: "x".repeat(9000), client_secret: "s", redirect_uris: uris }), /8192/);
});
