/**
 * @filemeta
 * type: test
 * title: Interactive wizard unit tests
 * description: Drives runInit with scripted answers and checks retries, stopping early, cancellation and home path expansion.
 * job_ref: untracked
 * functions: [scripted]
 * classes: []
 * inputs: [scripted answers, synthetic credentials]
 * outputs: [node:test results]
 * relations:
 *   - imports: src/commands/init.ts
 *   - validates: runInit
 * last_update: 2026-11-04
 */
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { createPrompter, expandHome, runInit, type Prompter } from "../../src/commands/init.js";

function scripted(answers: readonly string[]): { io: Prompter; output: () => string } {
  const queue = [...answers];
  let text = "";
  return {
    output: () => text,
    io: {
      async ask(question) {
        text += question;
        const next = queue.shift();
        if (next === undefined) throw new Error(`no answer for: ${question}`);
        return next;
      },
      write(value) { text += value; },
      close() { /* nothing to release */ },
    },
  };
}

test("wizard retries bad answers, uses defaults, and writes credentials", async () => {
  const root = await mkdtemp(join(tmpdir(), "oauth-init-"));
  try {
    const file = join(root, "in.json");
    await writeFile(file, JSON.stringify({ client_id: "id", client_secret: "WIZARD_SECRET", redirect_uris: ["http://localhost:3000/api/auth/callback/github"] }));
    const { io, output } = scripted(["9", "2", "http://not-secure.example", "", "", join(root, "missing.json"), `"${file}"`]);
    assert.equal(await runInit(io, root), 0, output());
    assert.match(output(), /Please enter a number/);
    assert.match(output(), /must use HTTPS/);
    assert.match(output(), /GitHub OAuth setup/);
    assert.doesNotMatch(output(), /WIZARD_SECRET/);
    assert.doesNotMatch(output(), /Then run:/);
    assert.match(await readFile(join(root, ".oauth-init", "github.env"), "utf8"), /GITHUB_REDIRECT_URI="http:\/\/localhost:3000\/api\/auth\/callback\/github"/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("leaving the file path empty stops without saving", async () => {
  const root = await mkdtemp(join(tmpdir(), "oauth-init-"));
  try {
    const { io, output } = scripted(["linkedin", "", "", ""]);
    assert.equal(await runInit(io, root), 0);
    assert.match(output(), /Nothing was saved/);
    assert.equal(existsSync(join(root, ".oauth-init")), false);
    assert.equal(existsSync(join(root, ".gitignore")), false);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("prompter delivers piped answers and rejects when input ends", async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const io = createPrompter(input, output);
  input.end("first\nsecond\n");
  assert.equal(await io.ask("? "), "first");
  assert.equal(await io.ask("? "), "second");
  await assert.rejects(io.ask("? "), /cancelled/);
  io.close();
});

test("expandHome handles ~, quotes and normal paths", () => {
  assert.equal(expandHome("~/a.json"), join(homedir(), "a.json"));
  assert.equal(expandHome('"~/a b.json"'), join(homedir(), "a b.json"));
  assert.equal(expandHome("'/tmp/a.json'"), "/tmp/a.json");
  assert.equal(expandHome("/tmp/~/a.json"), "/tmp/~/a.json");
});
