/**
 * @filemeta
 * type: test
 * title: Interactive wizard end-to-end test
 * description: Runs oauth-compass init per provider through piped answers and asserts files are created and secrets are not printed.
 * job_ref: untracked
 * functions: []
 * classes: []
 * inputs: [dist/src/cli.js, piped answers, synthetic credentials]
 * outputs: [node:test results]
 * relations:
 *   - reads: dist/src/cli.js
 *   - validates: src/commands/init.ts
 * last_update: 2026-11-04
 */
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const cli = resolve("dist/src/cli.js");

for (const [index, provider] of ["google", "github", "linkedin", "cognito"].entries()) {
  test(`E2E init ${provider}`, async () => {
    const cwd = await mkdtemp(join(tmpdir(), `oauth-wizard-${provider}-`));
    try {
      const redirect = `http://localhost:3000/api/auth/callback/${provider}`;
      const fields = { client_id: "test-id", client_secret: "WIZARD_SECRET", redirect_uris: [redirect],
        ...(provider === "cognito" ? { issuer: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_EXAMPLE" } : {}) };
      await writeFile(join(cwd, "in.json"), JSON.stringify(provider === "google" ? { web: fields } : fields));
      const answers = [`${index + 1}`, "", "", "in.json", ""].join("\n");
      const result = spawnSync(process.execPath, [cli, "init"], { cwd, encoding: "utf8", input: answers, timeout: 10000 });
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.match(result.stdout, /PASS/);
      assert.doesNotMatch(result.stdout + result.stderr, /WIZARD_SECRET/);
      assert.ok(existsSync(join(cwd, ".oauth-init", `${provider}.env`)));
    } finally { await rm(cwd, { recursive: true, force: true }); }
  });
}

test("E2E init stops cleanly when input ends", () => {
  const result = spawnSync(process.execPath, [cli, "init"], { encoding: "utf8", input: "1\n", timeout: 10000 });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /cancelled/);
});
