/**
 * @filemeta
 * type: utility
 * title: Provider drift checks
 * description: Compares provider documentation links, OIDC metadata and key doc phrases with what the CLI assumes, and returns a Report.
 * job_ref: untracked
 * functions: [extractLinks, normalizeText, runChecks, renderReport, checkLinks, checkOidc, checkPhrases]
 * classes: []
 * inputs: [Fetcher, provider guide markdown]
 * outputs: [Report, markdown issue body]
 * relations:
 *   - imports: src/providers/index.ts
 *   - used_by: scripts/check-providers.ts
 *   - tested_by: tests/unit/provider-checks.test.ts
 * last_update: 2026-11-04
 */
import { getProvider } from "../src/providers/index.js";

export type Finding = Readonly<{ provider: string; check: string; detail: string }>;
export type Report = Readonly<{ broken: readonly Finding[]; unverified: readonly Finding[]; passed: number }>;
export type FetchResult = Readonly<{ status: number; text: string }>;
export type Fetcher = (url: string) => Promise<FetchResult>;

type Result = Readonly<{ state: "passed" | "broken" | "unverified"; finding: Finding }>;
type OidcExpectation = Readonly<{ provider: string; url: string; issuer: string; authorizationEndpoint: string }>;
type PhraseExpectation = Readonly<{ provider: string; url: string; phrase: string; why: string }>;

const oidcExpectations: readonly OidcExpectation[] = [
  { provider: "google", url: "https://accounts.google.com/.well-known/openid-configuration",
    issuer: "https://accounts.google.com", authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth" },
  { provider: "linkedin", url: "https://www.linkedin.com/oauth/.well-known/openid-configuration",
    issuer: "https://www.linkedin.com/oauth", authorizationEndpoint: "https://www.linkedin.com/oauth/v2/authorization" },
];

// Each phrase backs an instruction in the CLI or a guide. A missing phrase means that instruction needs a review.
const phraseExpectations: readonly PhraseExpectation[] = [
  { provider: "google", url: "https://support.google.com/cloud/answer/15549257", phrase: "at the time of their creation",
    why: "The Google guide says the secret is shown only at creation." },
  { provider: "google", url: "https://developers.google.com/identity/protocols/oauth2/web-server", phrase: "redirect_uri_mismatch",
    why: "The Google guide relies on exact redirect URI matching." },
  { provider: "github", url: "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app", phrase: "up to 10 callback URLs",
    why: "The GitHub guide says an OAuth App can have 10 callback URLs." },
  { provider: "linkedin", url: "https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access", phrase: "Sign in with LinkedIn using OpenID Connect",
    why: "The LinkedIn guide tells users to request this product." },
  { provider: "cognito", url: "https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-client-apps.html", phrase: "Traditional web application",
    why: "The Cognito guide tells users to choose this application type." },
  { provider: "cognito", url: "https://docs.aws.amazon.com/cognito/latest/developerguide/federation-endpoints.html", phrase: "cognito-idp.",
    why: "The Cognito guide builds the issuer from this format." },
];

export function extractLinks(markdown: string): string[] {
  return [...new Set([...markdown.matchAll(/\]\((https:\/\/[^)\s]+)\)/g)].map((match) => match[1] ?? "").filter(Boolean))];
}

export function normalizeText(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").toLowerCase();
}

// Only a definite "gone" counts as broken: bots are often refused pages that work fine for people.
function unreachable(status: number): boolean {
  return status === 0 || status === 401 || status === 403 || status === 429 || status >= 500;
}

async function checkLinks(fetcher: Fetcher, provider: string, markdown: string): Promise<Result[]> {
  return Promise.all(extractLinks(markdown).map(async (url) => {
    const { status } = await fetcher(url);
    const finding = { provider, check: "link", detail: `${url} returned HTTP ${status}` };
    if (unreachable(status)) return { state: "unverified" as const, finding };
    return { state: status < 400 ? "passed" as const : "broken" as const, finding };
  }));
}

function parseObject(text: string): Record<string, unknown> | undefined {
  try {
    const value = JSON.parse(text) as unknown;
    return typeof value === "object" && value !== null ? value as Record<string, unknown> : undefined;
  } catch { return undefined; }
}

async function checkOidc(fetcher: Fetcher, expected: OidcExpectation): Promise<Result> {
  const { status, text } = await fetcher(expected.url);
  const check = "oidc";
  if (unreachable(status)) return { state: "unverified", finding: { provider: expected.provider, check, detail: `${expected.url} returned HTTP ${status}` } };
  const data = parseObject(text);
  const scopes = Array.isArray(data?.scopes_supported) ? data.scopes_supported : [];
  const missing = getProvider(expected.provider).scopes.filter((scope) => !scopes.includes(scope));
  const problems = [
    ...(status >= 400 || !data ? [`${expected.url} returned HTTP ${status} or invalid JSON`] : []),
    ...(data && data.issuer !== expected.issuer ? ["the issuer changed"] : []),
    ...(data && data.authorization_endpoint !== expected.authorizationEndpoint ? ["the authorization endpoint changed"] : []),
    ...(data && missing.length > 0 ? [`scopes no longer listed: ${missing.join(", ")}`] : []),
  ];
  return { state: problems.length > 0 ? "broken" : "passed", finding: { provider: expected.provider, check, detail: problems.join("; ") } };
}

async function checkPhrases(fetcher: Fetcher, expected: PhraseExpectation): Promise<Result> {
  const { status, text } = await fetcher(expected.url);
  const finding = { provider: expected.provider, check: "documentation", detail: `"${expected.phrase}" was not found on ${expected.url}. ${expected.why}` };
  if (unreachable(status)) return { state: "unverified", finding: { ...finding, detail: `${expected.url} returned HTTP ${status}` } };
  return { state: status < 400 && normalizeText(text).includes(expected.phrase.toLowerCase()) ? "passed" : "broken", finding };
}

export async function runChecks(fetcher: Fetcher, guides: Readonly<Record<string, string>>): Promise<Report> {
  const results = (await Promise.all([
    ...Object.entries(guides).map(([provider, markdown]) => checkLinks(fetcher, provider, markdown)),
    Promise.all(oidcExpectations.map((expected) => checkOidc(fetcher, expected))),
    Promise.all(phraseExpectations.map((expected) => checkPhrases(fetcher, expected))),
  ])).flat();
  return {
    broken: results.filter((result) => result.state === "broken").map((result) => result.finding),
    unverified: results.filter((result) => result.state === "unverified").map((result) => result.finding),
    passed: results.filter((result) => result.state === "passed").length,
  };
}

export function renderReport(report: Report): string {
  const lines = (findings: readonly Finding[]): string[] => findings.map((item) => `- **${item.provider}** (${item.check}): ${item.detail}`);
  return [
    "The scheduled provider check found something that no longer matches what OAuth Compass documents.",
    "", "## Needs review", "", ...lines(report.broken),
    ...(report.unverified.length > 0 ? ["", "## Could not be checked", "", ...lines(report.unverified)] : []),
    "", "## What to do", "",
    "1. Compare the provider's documentation with the matching guide in `docs/`.",
    "2. Update the guide, the provider adapter in `src/providers/`, or the expectations in `scripts/provider-checks.ts`.",
    "3. Close this issue.",
    "", `Checks passed: ${report.passed}. This check cannot see the provider consoles, so a renamed button will not appear here.`, "",
  ].join("\n");
}
