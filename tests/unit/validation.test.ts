/**
 * @filemeta
 * type: test
 * title: URL and provider unit tests
 * description: Tests URL validation, exact redirect storage and matching, origin output, provider registration and Google web JSON.
 * job_ref: legacy
 * functions: []
 * classes: []
 * inputs: [synthetic credentials]
 * outputs: [node:test results]
 * relations:
 *   - imports: src/core/validation.ts
 *   - imports: src/providers/index.ts
 *   - imports: src/commands/guide.ts
 *   - validates: validateUrl
 *   - validates: normalizeCredentials
 * last_update: 2026-11-04
 */
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { validateUrl, normalizeCredentials } from "../../src/core/validation.js";
import { getProvider } from "../../src/providers/index.js";
import { createGuide } from "../../src/commands/guide.js";
test("localhost HTTP is allowed; insecure remote callback is denied", () => {
  assert.equal(validateUrl("http://localhost:3000/callback", "redirect"), "http://localhost:3000/callback");
  assert.throws(() => validateUrl("http://example.com/callback", "redirect"));
});
test("URL with embedded credentials rejected", () => {
  assert.throws(() => validateUrl("https://user:pass@example.com/callback", "redirect"));
});
test("all provider adapters are registered", () => {
  for (const id of ["google", "github", "linkedin", "cognito"]) assert.equal(getProvider(id).id, id);
  assert.throws(() => getProvider("discord"));
});
test("redirect mismatch must fail", () => {
  assert.throws(() => normalizeCredentials("github", "id", "secret", ["http://localhost:3000/cb"], "http://localhost:3000/other"));
});
test("Google requires downloaded Web client structure", () => {
  assert.throws(() => getProvider("google").parseCredentials({ installed: { client_id: "id" } }));
});
test("F-03: redirect URIs are stored exactly as registered", () => {
  for (const uri of ["https://EXAMPLE.com:443/cb", "http://localhost:3000", "https://example.com/Cb/"]) {
    assert.equal(validateUrl(uri, "redirect"), uri);
    assert.deepEqual(normalizeCredentials("github", "id", "secret", [uri]).redirectUris, [uri]);
  }
});
test("F-03: redirect mismatch is exact on case and trailing slash", () => {
  assert.throws(() => normalizeCredentials("github", "id", "secret", ["http://localhost:3000"], "http://localhost:3000/"));
  assert.throws(() => normalizeCredentials("github", "id", "secret", ["https://example.com/cb"], "https://EXAMPLE.com/cb"));
});
test("F-03: URL parsing cannot silently strip whitespace or control characters", () => {
  for (const uri of [" http://localhost:3000/cb", "http://localhost:3000/cb\n", "http://local\thost:3000/cb"]) {
    assert.throws(() => validateUrl(uri, "redirect"));
  }
});
test("F-04: origins have no trailing slash", () => {
  assert.equal(validateUrl("http://localhost:3000", "origin"), "http://localhost:3000");
  assert.equal(validateUrl("https://app.example.com/", "origin"), "https://app.example.com");
  assert.ok(createGuide("google", "http://localhost:3000", "http://localhost:3000/cb").includes("homepage: http://localhost:3000\n"));
});
