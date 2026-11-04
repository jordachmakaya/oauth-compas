/**
 * @filemeta
 * type: test
 * title: URL and credential rule tests
 * description: Tests rejection of unsafe redirect URLs, Google raw IP rules, control characters in credentials and Google step wording.
 * job_ref: untracked
 * functions: []
 * classes: []
 * inputs: [synthetic URLs, synthetic credentials]
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
import { normalizeCredentials, validateUrl } from "../../src/core/validation.js";
import { getProvider } from "../../src/providers/index.js";
import { createGuide } from "../../src/commands/guide.js";

test("F-08: disallowed redirect URLs are rejected", () => {
  const rejected = [
    "https://example.com/cb#",
    "https://example.com/cb#frag",
    "https://*.example.com/cb",
    "https://example.com/a/../cb",
    "https://example.com/%2e%2e/cb",
    "https://example.com/%2E%2E",
    "https://@example.com/cb",
    "https://example.com/cb?next=https://evil.example/",
    "https://example.com/cb?next=https%3A%2F%2Fevil.example",
    "https://example.com/cb?next=//evil.example",
  ];
  for (const uri of rejected) assert.throws(() => validateUrl(uri, "redirect"), Error, uri);
});

test("F-08: ordinary redirect URLs stay accepted", () => {
  for (const uri of ["https://example.com/cb?tenant=acme", "https://example.com/a..b/cb", "http://[::1]:3000/cb"]) {
    assert.equal(validateUrl(uri, "redirect"), uri);
  }
});

test("F-08: origins reject an empty query or fragment", () => {
  for (const origin of ["https://example.com/?", "https://example.com/#"]) {
    assert.throws(() => validateUrl(origin, "origin"), Error, origin);
  }
});

test("F-08: Google refuses raw IP hosts except loopback; other providers do not apply that rule", () => {
  const input = (uri: string) => ({ web: { client_id: "id", client_secret: "s", redirect_uris: [uri] } });
  assert.throws(() => getProvider("google").parseCredentials(input("https://1.2.3.4/cb")), /raw IP/);
  assert.throws(() => getProvider("google").parseCredentials(input("https://[2001:db8::1]/cb")), /raw IP/);
  assert.throws(() => createGuide("google", "http://localhost:3000", "https://1.2.3.4/cb"), /raw IP/);
  assert.equal(getProvider("google").parseCredentials(input("http://127.0.0.1:3000/cb")).clientId, "id");
  assert.equal(getProvider("github").parseCredentials({ client_id: "id", client_secret: "s", redirect_uris: ["https://1.2.3.4/cb"] }).clientId, "id");
});

test("F-06: credentials with control characters or surrounding spaces are rejected without echoing them", () => {
  const uris = ["http://localhost:3000/cb"];
  for (const secret of ["SYNTHETIC\nINJECT=1", "SYNTHETIC\u0000", "  SYNTHETIC", "SYNTHETIC  "]) {
    assert.throws(() => normalizeCredentials("github", "id", secret, uris), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.doesNotMatch(error.message, /SYNTHETIC/);
      return true;
    });
  }
  assert.throws(() => normalizeCredentials("github", " id", "secret", uris));
});

test("F-09: Google steps say the secret must be downloaded at creation", () => {
  assert.ok(getProvider("google").steps.some((step) => /immediately/i.test(step) && /once/i.test(step)));
});
