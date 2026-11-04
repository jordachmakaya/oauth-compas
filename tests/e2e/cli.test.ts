/**
 * @filemeta
 * type: test
 * title: Compiled CLI end-to-end tests
 * description: Runs the compiled CLI per provider through guide, import and doctor, and asserts synthetic secrets are not printed.
 * job_ref: legacy
 * functions: [run]
 * classes: []
 * inputs: [dist/src/cli.js, synthetic credentials]
 * outputs: [node:test results]
 * relations:
 *   - reads: dist/src/cli.js
 *   - validates: src/cli.ts
 * last_update: 2026-11-04
 */
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const cli = resolve("dist/src/cli.js");
function run(...args: string[]) {
  return spawnSync(process.execPath, [cli, ...args], {encoding:"utf8", timeout:10000});
}
for (const provider of ["google", "github", "linkedin", "cognito"] as const) {
  test(`E2E ${provider}: guide/import/doctor + redact CLI output`, async () => {
    const root = await mkdtemp(join(tmpdir(), `oauth-e2e-${provider}-`));
    try {
      const redirect = `http://localhost:3000/api/auth/callback/${provider}`;
      const guide = run("guide", provider, "--origin", "http://localhost:3000", "--redirect", redirect);
      assert.equal(guide.status, 0, guide.stderr); assert.match(guide.stdout, new RegExp(provider, "i"));
      const input = provider === "google"
        ? {web:{client_id:"test-id",client_secret:"E2E_SECRET_DO_NOT_PRINT",redirect_uris:[redirect]}}
        : {client_id:"test-id",client_secret:"E2E_SECRET_DO_NOT_PRINT",redirect_uris:[redirect],
          ...(provider === "cognito" ? {issuer:"https://cognito-idp.us-east-1.amazonaws.com/us-east-1_EXAMPLE"} : {})};
      const path = join(root,"input.json");
      await writeFile(path, JSON.stringify(input));
      const imported = run("import",provider,"--file",path,"--redirect",redirect,"--out",root);
      assert.equal(imported.status,0, imported.stderr);
      assert.doesNotMatch(imported.stdout + imported.stderr, /E2E_SECRET_DO_NOT_PRINT/);
      assert.match(await readFile(join(root,".gitignore"),"utf8"), /\.oauth-init\//);
      const inspected = run("doctor",provider,"--out",root);
      assert.equal(inspected.status,0, inspected.stdout + inspected.stderr);
      const second = run("import",provider,"--file",path,"--out",root);
      assert.equal(second.status,1);
      assert.doesNotMatch(second.stdout + second.stderr, /E2E_SECRET_DO_NOT_PRINT/);
    } finally { await rm(root,{recursive:true,force:true}); }
  });
}
test("E2E CLI rejects unregistered provider", () => {
  const result = run("guide","fake","--origin","http://localhost:3000","--redirect","http://localhost:3000/cb");
  assert.equal(result.status,1);
});
