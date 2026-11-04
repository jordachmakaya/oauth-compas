/**
 * @filemeta
 * type: test
 * title: CLI argument handling tests
 * description: Runs the compiled CLI to check rejection of unknown or repeated options, stray arguments, and per-command help.
 * job_ref: untracked
 * functions: [run]
 * classes: []
 * inputs: [dist/src/cli.js, synthetic credentials]
 * outputs: [node:test results]
 * relations:
 *   - reads: dist/src/cli.js
 *   - validates: src/main.ts
 * last_update: 2026-11-04
 */
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const cli = resolve("dist/src/cli.js");
const run = (args: readonly string[], cwd?: string): SpawnSyncReturns<string> =>
  spawnSync(process.execPath, [cli, ...args], { encoding: "utf8", timeout: 10000, cwd, input: "" });

test("F-05: a mistyped option writes nothing", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "oauth-args-"));
  try {
    const input = join(cwd, "in.json");
    await writeFile(input, JSON.stringify({ client_id: "id", client_secret: "ARGS_SECRET", redirect_uris: ["http://localhost:3000/cb"] }));
    const result = run(["import", "github", "--file", input, "--oot", join(cwd, "safe")], cwd);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unknown option --oot/);
    assert.equal(existsSync(join(cwd, ".oauth-init")), false);
  } finally { await rm(cwd, { recursive: true, force: true }); }
});

test("F-05: unknown option text after = is not echoed", () => {
  const result = run(["guide", "github", "--secret=ARGS_SECRET"]);
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.stderr, /ARGS_SECRET/);
});

test("F-05: repeated options and stray arguments are rejected", () => {
  const url = "http://localhost:3000";
  assert.equal(run(["guide", "github", "--origin", url, "--origin", "https://evil.example", "--redirect", `${url}/cb`]).status, 1);
  const stray = run(["guide", "github", "ARGS_SECRET", "--origin", url, "--redirect", `${url}/cb`]);
  assert.equal(stray.status, 1);
  assert.doesNotMatch(stray.stderr, /ARGS_SECRET/);
  assert.equal(run(["providers", "extra"]).status, 1);
});

test("--help works after a command, and bare invocation without a terminal prints help", () => {
  for (const args of [["guide", "--help"], ["import", "github", "-h"], []]) {
    const result = run(args);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Usage:/);
  }
});
