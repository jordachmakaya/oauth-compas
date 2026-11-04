/**
 * @filemeta
 * type: test
 * title: Packed package install test
 * description: Packs the project, installs the tarball like a consumer, and runs the oauth-compass binary and skill install.
 * job_ref: untracked
 * functions: [runBin]
 * classes: []
 * inputs: [package.json files list, dist/src/cli.js, synthetic credentials]
 * outputs: [node:test results]
 * relations:
 *   - reads: package.json
 *   - validates: src/cli.ts
 * last_update: 2026-11-04
 */
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const windows = process.platform === "win32";
const npm = (args: string, cwd: string): SpawnSyncReturns<string> =>
  spawnSync(`npm ${args}`, { cwd, encoding: "utf8", shell: true, timeout: 120000 });

// npm's bin symlink on POSIX is the reason this test exists; the .cmd shim needs a shell on Windows.
function runBin(project: string, args: string): SpawnSyncReturns<string> {
  const bin = join(project, "node_modules", ".bin", windows ? "oauth-compass.cmd" : "oauth-compass");
  return spawnSync(`"${bin}" ${args}`, { cwd: project, encoding: "utf8", shell: true, timeout: 30000 });
}

test("packed tarball: installed binary runs and writes credentials", { timeout: 180000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), "oauth-pack-"));
  try {
    // The space and "#" are part of the regression: both broke the former entry-point guard.
    const project = join(root, "consumer app #1");
    await mkdir(project);
    await writeFile(join(project, "package.json"), '{"name":"consumer","private":true}\n');
    // --ignore-scripts: the build is a dependency of this task, and rebuilding here would race other tests.
    const packed = npm(`pack --ignore-scripts --pack-destination "${root}"`, process.cwd());
    assert.equal(packed.status, 0, packed.stderr);
    const tarball = (await readdir(root)).find((name) => name.endsWith(".tgz"));
    assert.ok(tarball);
    const installed = npm(`install --offline --no-audit --no-fund "${join(root, tarball)}"`, project);
    assert.equal(installed.status, 0, installed.stderr);

    const providers = runBin(project, "providers");
    assert.equal(providers.status, 0, providers.stderr);
    assert.deepEqual(providers.stdout.trim().split(/\r?\n/), ["google", "github", "linkedin"]);

    const input = { client_id: "test-id", client_secret: "PACK_SECRET_DO_NOT_PRINT", redirect_uris: ["http://localhost:3000/cb"] };
    await writeFile(join(project, "input.json"), JSON.stringify(input));
    const imported = runBin(project, 'import github --file input.json --out .');
    assert.equal(imported.status, 0, imported.stderr);
    assert.doesNotMatch(imported.stdout + imported.stderr, /PACK_SECRET_DO_NOT_PRINT/);
    assert.ok(existsSync(join(project, ".oauth-init", "github.env")));
    assert.match(await readFile(join(project, ".oauth-init", "github.env"), "utf8"), /GITHUB_CLIENT_SECRET/);

    const skill = runBin(project, "skill install");
    assert.equal(skill.status, 0, skill.stderr);
    assert.match(await readFile(join(project, ".claude", "skills", "oauth-compass", "SKILL.md"), "utf8"), /name: oauth-compass/);
    assert.equal(runBin(project, "skill install").status, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});
