/**
 * @filemeta
 * type: test
 * title: README accuracy tests
 * description: Tests that the README's expected providers output and provider tables list every registered provider.
 * job_ref: untracked
 * functions: []
 * classes: []
 * inputs: [README.md, providerIds]
 * outputs: [node:test results]
 * relations:
 *   - reads: README.md
 *   - imports: src/providers/index.ts
 * last_update: 2026-11-04
 */
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getProvider, providerIds } from "../../src/providers/index.js";

const readme = (await readFile("README.md", "utf8")).replace(/\r\n/g, "\n");

test("the expected output of the providers command lists every provider", () => {
  const block = /providers\n```\n\nExpected result:\n\n```text\n([\s\S]*?)\n```/.exec(readme)?.[1];
  assert.deepEqual(block?.split("\n"), [...providerIds]);
});

test("every provider has a guide link and a compatibility row", () => {
  for (const id of providerIds) {
    assert.ok(readme.includes(`(docs/${id}.md)`), id);
    assert.ok(readme.includes(`| ${getProvider(id).label} |`), id);
  }
});
