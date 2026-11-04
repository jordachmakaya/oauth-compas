/**
 * @filemeta
 * type: test
 * title: Amazon Cognito adapter tests
 * description: Tests Cognito issuer validation, the localhost-only HTTP rule and the issuer entry in generated .env content.
 * job_ref: untracked
 * functions: [input]
 * classes: []
 * inputs: [synthetic credentials]
 * outputs: [node:test results]
 * relations:
 *   - imports: src/providers/index.ts
 *   - imports: src/core/storage.ts
 *   - imports: src/commands/guide.ts
 * last_update: 2026-11-04
 */
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { createGuide } from "../../src/commands/guide.js";
import { envContent } from "../../src/core/storage.js";
import { getProvider } from "../../src/providers/index.js";

const issuer = "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_EXAMPLE";
const input = (overrides: Record<string, unknown> = {}) => ({
  client_id: "test-id", client_secret: "TEST_SECRET", issuer, redirect_uris: ["http://localhost:3000/cb"], ...overrides,
});

test("Cognito keeps the issuer and writes it to the .env", () => {
  const credentials = getProvider("cognito").parseCredentials(input());
  assert.ok(envContent(credentials).includes(`COGNITO_ISSUER="${issuer}"`));
  assert.ok(envContent(credentials).includes('COGNITO_CLIENT_SECRET="TEST_SECRET"'));
});

test("Cognito accepts the updated issuer format", () => {
  const updated = "https://issuer-cognito-idp.eu-west-1.amazonaws.com/eu-west-1_abc123";
  assert.equal(getProvider("cognito").parseCredentials(input({ issuer: updated })).extras.ISSUER, updated);
});

test("Cognito rejects a missing or foreign issuer", () => {
  for (const value of [undefined, "", "https://evil.example/us-east-1_EXAMPLE", "http://cognito-idp.us-east-1.amazonaws.com/us-east-1_EXAMPLE"]) {
    assert.throws(() => getProvider("cognito").parseCredentials(input({ issuer: value })), /issuer must look like/);
  }
});

test("Cognito allows HTTP only for localhost", () => {
  assert.throws(() => getProvider("cognito").parseCredentials(input({ redirect_uris: ["http://127.0.0.1:3000/cb"] })), /localhost/);
  assert.throws(() => createGuide("cognito", "http://localhost:3000", "http://127.0.0.1:3000/cb"), /localhost/);
  assert.equal(getProvider("cognito").parseCredentials(input({ redirect_uris: ["https://app.example.com/cb"] })).clientId, "test-id");
});

test("Cognito steps require a client secret and stay manual", () => {
  assert.ok(getProvider("cognito").steps.some((step) => step.includes("Traditional web application")));
});
