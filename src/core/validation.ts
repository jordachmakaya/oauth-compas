/**
 * @filemeta
 * type: schema
 * title: Credential and URL validation
 * description: Validates unknown JSON fields and HTTP(S) URLs and returns normalized OAuthCredentials or throws UserError.
 * job_ref: legacy
 * functions: [record, nonEmptyString, credentialValue, validateUrl, redirectUris, normalizeCredentials]
 * classes: []
 * inputs: [unknown JSON value, url string, expectedRedirectUri]
 * outputs: [OAuthCredentials, normalized URL, UserError]
 * relations:
 *   - imports: src/core/errors.ts
 *   - imports: src/core/types.ts
 *   - used_by: src/commands/guide.ts
 *   - used_by: src/commands/init.ts
 *   - used_by: src/providers/google.ts
 *   - used_by: src/providers/github.ts
 *   - used_by: src/providers/linkedin.ts
 *   - used_by: src/providers/cognito.ts
 *   - tested_by: tests/unit/validation.test.ts
 * last_update: 2026-11-04
 */
import { UserError } from "./errors.js";
import type { ProviderId } from "./types.js";

export function record(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new UserError(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
}
export function nonEmptyString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 8192) {
    throw new UserError(`${name} must be a non-empty string of at most 8192 characters`);
  }
  return value;
}
function credentialValue(value: unknown, name: string): string {
  const text = nonEmptyString(value, name);
  if (text !== text.trim() || /[\u0000-\u001f\u007f]/.test(text)) {
    throw new UserError(`${name} must not contain control characters or surrounding spaces`);
  }
  return text;
}
export function validateUrl(value: string, kind: "origin" | "redirect"): string {
  if (/[\s\u0000-\u001f\u007f]/.test(value)) {
    throw new UserError(`${kind} URL must not contain whitespace or control characters`);
  }
  if (value.includes("#") || value.includes("*")) {
    throw new UserError(`${kind} URL must not contain a fragment or wildcard`);
  }
  if (/^[a-z][a-z0-9+.-]*:\/\/[^/?]*@/i.test(value)) {
    throw new UserError(`${kind} URL must be HTTP(S) without credentials or fragment`);
  }
  if (/\/(?:\.|%2e){2}(?:[/?]|$)/i.test(value)) throw new UserError(`${kind} URL must not contain path traversal`);
  let url: URL;
  try { url = new URL(value); } catch { throw new UserError(`Invalid ${kind} URL`); }
  if (url.username || url.password || url.hash || !["http:", "https:"].includes(url.protocol)) {
    throw new UserError(`${kind} URL must be HTTP(S) without credentials or fragment`);
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !local) {
    throw new UserError(`Non-local ${kind} URL must use HTTPS`);
  }
  if (kind === "origin" && (url.pathname !== "/" || value.includes("?"))) {
    throw new UserError("Origin URL must not include path or query");
  }
  if ([...url.searchParams.values()].some((param) => /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(param))) {
    throw new UserError(`${kind} URL must not carry another URL in its query`);
  }
  // Providers match redirect URIs exactly, so the registered string is kept as written.
  return kind === "origin" ? url.origin : value;
}
export function redirectUris(value: unknown, name: string): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) {
    throw new UserError(`${name} must contain 1-20 redirect URLs`);
  }
  return value.map((entry: unknown) => validateUrl(nonEmptyString(entry, name), "redirect"));
}
export function normalizeCredentials(
  provider: ProviderId, clientId: unknown, clientSecret: unknown, uris: unknown,
  expectedRedirectUri?: string,
): import("./types.js").OAuthCredentials {
  const parsed = redirectUris(uris, "redirect_uris");
  const [first] = parsed;
  if (first === undefined) throw new UserError("redirect_uris must contain 1-20 redirect URLs");
  const selected = expectedRedirectUri === undefined ? first : validateUrl(expectedRedirectUri, "redirect");
  if (!parsed.includes(selected)) {
    throw new UserError("Expected redirect URI is not present in the credentials file");
  }
  return { provider, clientId: credentialValue(clientId, "client_id"),
    clientSecret: credentialValue(clientSecret, "client_secret"), redirectUris: parsed, redirectUri: selected, extras: {},
    importedAt: new Date().toISOString() };
}
