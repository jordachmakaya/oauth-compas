/**
 * @filemeta
 * type: test
 * title: Credential storage integration test
 * description: Tests that saveCredentials writes private files in a temp directory and refuses a second write.
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
import { saveCredentials, outputPaths } from "../../src/core/storage.js";
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
