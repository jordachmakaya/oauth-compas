/**
 * @filemeta
 * type: test
 * title: Credential storage integration test
 * description: Tests that saveCredentials writes private files, refuses a second write, and that .env uses the selected redirect.
 * job_ref: legacy
 * functions: []
 * classes: []
 * inputs: [synthetic credentials]
 * outputs: [node:test results]
 * relations:
 *   - imports: src/core/storage.ts
 *   - imports: src/providers/index.ts
 *   - validates: saveCredentials
 * last_update: 2026-11-04
 */
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { mkdtemp, readFile, stat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { envContent, saveCredentials, outputPaths } from "../../src/core/storage.js";
import { getProvider } from "../../src/providers/index.js";
test("stores secrets in private files, never overwrites", async () => {
  const root = await mkdtemp(join(tmpdir(), "oauth-compass-storage-"));
  try {
    const credentials = getProvider("github").parseCredentials({client_id:"test-id", client_secret:"TEST_SECRET_123", redirect_uris:["http://localhost:3000/cb"]});
    await saveCredentials(root, credentials);
    const paths = outputPaths(root, "github");
    assert.match(await readFile(paths.env,"utf8"), /GITHUB_CLIENT_SECRET/);
    if (process.platform !== "win32") assert.equal((await stat(paths.json)).mode & 0o077, 0);
    await assert.rejects(saveCredentials(root, credentials));
  } finally { await rm(root, {recursive: true, force: true}); }
});
test("F-02: .env uses the redirect selected with --redirect, else the first URI", () => {
  const input = { client_id: "test-id", client_secret: "TEST_SECRET_123", redirect_uris: ["http://localhost:3000/a", "https://app.example.com/b"] };
  const selected = getProvider("github").parseCredentials(input, "https://app.example.com/b");
  assert.ok(envContent(selected).includes('GITHUB_REDIRECT_URI="https://app.example.com/b"'));
  assert.deepEqual(selected.redirectUris, input.redirect_uris);
  assert.ok(envContent(getProvider("github").parseCredentials(input)).includes('GITHUB_REDIRECT_URI="http://localhost:3000/a"'));
});
