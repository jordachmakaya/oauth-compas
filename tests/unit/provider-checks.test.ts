/**
 * @filemeta
 * type: test
 * title: Provider drift check tests
 * description: Tests with a fake network that dead links, changed OIDC metadata and missing phrases are reported, and blocked pages are not.
 * job_ref: untracked
 * functions: [healthy, withOverride]
 * classes: []
 * inputs: [fake Fetcher responses]
 * outputs: [node:test results]
 * relations:
 *   - imports: scripts/provider-checks.ts
 *   - validates: runChecks
 *   - validates: renderReport
 * last_update: 2026-11-04
 */
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { extractLinks, normalizeText, renderReport, runChecks, type FetchResult, type Fetcher } from "../../scripts/provider-checks.js";

const googleOidc = { issuer: "https://accounts.google.com", authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth", scopes_supported: ["openid", "email", "profile"] };
const linkedinOidc = { issuer: "https://www.linkedin.com/oauth", authorization_endpoint: "https://www.linkedin.com/oauth/v2/authorization", scopes_supported: ["openid", "profile", "email"] };
const allPhrases = "at the time of their creation redirect_uri_mismatch up to 10 callback URLs Sign in with LinkedIn using OpenID Connect Traditional web application cognito-idp.";

const healthy: Fetcher = async (url) => {
  if (url.includes("accounts.google.com")) return { status: 200, text: JSON.stringify(googleOidc) };
  if (url.includes("openid-configuration")) return { status: 200, text: JSON.stringify(linkedinOidc) };
  return { status: 200, text: allPhrases };
};
const withOverride = (match: string, result: FetchResult): Fetcher => async (url) => url.includes(match) ? result : healthy(url);
const guides = { github: "[Docs](https://docs.example.com/page) and [more](https://docs.example.com/other)" };

test("a healthy provider state reports nothing", async () => {
  const report = await runChecks(healthy, guides);
  assert.deepEqual(report.broken, []);
  assert.deepEqual(report.unverified, []);
  assert.ok(report.passed > 0);
});

test("a dead link is broken", async () => {
  const report = await runChecks(withOverride("docs.example.com/page", { status: 404, text: "" }), guides);
  assert.equal(report.broken.length, 1);
  assert.match(report.broken[0]?.detail ?? "", /HTTP 404/);
});

test("blocked or failing pages are unverified, never broken", async () => {
  for (const status of [0, 401, 403, 429, 503]) {
    const report = await runChecks(withOverride("docs.example.com/page", { status, text: "" }), guides);
    assert.deepEqual(report.broken, [], String(status));
    assert.equal(report.unverified.length, 1);
  }
});

test("changed OIDC metadata is broken", async () => {
  const changed = { ...googleOidc, authorization_endpoint: "https://accounts.google.com/new", scopes_supported: ["openid"] };
  const report = await runChecks(withOverride("accounts.google.com", { status: 200, text: JSON.stringify(changed) }), guides);
  const detail = report.broken.find((item) => item.check === "oidc")?.detail ?? "";
  assert.match(detail, /authorization endpoint changed/);
  assert.match(detail, /email, profile/);
});

test("invalid OIDC JSON is broken", async () => {
  const report = await runChecks(withOverride("accounts.google.com", { status: 200, text: "<html>" }), guides);
  assert.equal(report.broken.filter((item) => item.check === "oidc").length, 1);
});

test("a missing documentation phrase is broken and says why it matters", async () => {
  const report = await runChecks(withOverride("support.google.com", { status: 200, text: "rewritten page" }), guides);
  const finding = report.broken.find((item) => item.check === "documentation");
  assert.equal(finding?.provider, "google");
  assert.match(finding?.detail ?? "", /only at creation/);
});

test("phrases match across HTML tags, case and line breaks", () => {
  assert.ok(normalizeText("<p>Up to\n <b>10</b>&nbsp;callback URLs</p>").includes("up to 10 callback urls"));
});

test("links are extracted once, https only", () => {
  assert.deepEqual(extractLinks("[a](https://a.example/x) [b](https://a.example/x) [c](http://b.example) [d](docs/x.md)"), ["https://a.example/x"]);
});

test("the report lists findings and states what it cannot see", async () => {
  const body = renderReport(await runChecks(withOverride("docs.example.com/page", { status: 404, text: "" }), guides));
  assert.match(body, /\*\*github\*\* \(link\)/);
  assert.match(body, /cannot see the provider consoles/);
});
