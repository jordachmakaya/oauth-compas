/**
 * @filemeta
 * type: test
 * title: URL and provider unit tests
 * description: Tests URL validation, redirect mismatch rejection, provider registration and the Google web JSON requirement.
 * job_ref: legacy
 * functions: []
 * classes: []
 * inputs: [synthetic credentials]
 * outputs: [node:test results]
 * relations:
 *   - imports: src/core/validation.ts
 *   - imports: src/providers/index.ts
 *   - validates: validateUrl
 *   - validates: normalizeCredentials
 * last_update: 2026-11-04
 */
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { validateUrl, normalizeCredentials } from "../../src/core/validation.js";
import { getProvider } from "../../src/providers/index.js";
test("localhost HTTP is allowed; insecure remote callback is denied", () => {
  assert.equal(validateUrl("http://localhost:3000/callback", "redirect"), "http://localhost:3000/callback");
  assert.throws(() => validateUrl("http://example.com/callback", "redirect"));
});
test("URL with embedded credentials rejected", () => {
  assert.throws(() => validateUrl("https://user:pass@example.com/callback", "redirect"));
});
test("all three provider adapters are registered", () => {
  for (const id of ["google", "github", "linkedin"]) assert.equal(getProvider(id).id, id);
  assert.throws(() => getProvider("discord"));
});
test("redirect mismatch must fail", () => {
  assert.throws(() => normalizeCredentials("github", "id", "secret", ["http://localhost:3000/cb"], "http://localhost:3000/other"));
});
test("Google requires downloaded Web client structure", () => {
  assert.throws(() => getProvider("google").parseCredentials({ installed: { client_id: "id" } }));
});
