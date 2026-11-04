/**
 * @filemeta
 * type: schema
 * title: Credential and URL validation
 * description: Validates unknown JSON fields and HTTP(S) URLs and returns normalized OAuthCredentials or throws UserError.
 * job_ref: legacy
 * functions: [record, nonEmptyString, validateUrl, redirectUris, normalizeCredentials]
 * classes: []
 * inputs: [unknown JSON value, url string, expectedRedirectUri]
 * outputs: [OAuthCredentials, normalized URL, UserError]
 * relations:
 *   - imports: src/core/errors.ts
 *   - imports: src/core/types.ts
 *   - used_by: src/commands/guide.ts
 *   - used_by: src/providers/google.ts
 *   - used_by: src/providers/github.ts
 *   - used_by: src/providers/linkedin.ts
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
    throw new UserError(`${name} must be a non-empty string`);
  }
  return value;
}
export function validateUrl(value: string, kind: "origin" | "redirect"): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new UserError(`Invalid ${kind} URL`); }
  if (url.username || url.password || url.hash || !["http:", "https:"].includes(url.protocol)) {
    throw new UserError(`${kind} URL must be HTTP(S) without credentials or fragment`);
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !local) {
    throw new UserError(`Non-local ${kind} URL must use HTTPS`);
  }
  if (kind === "origin" && (url.pathname !== "/" || url.search)) {
    throw new UserError("Origin URL must not include path or query");
  }
  return url.toString();
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
  if (expectedRedirectUri && !parsed.includes(validateUrl(expectedRedirectUri, "redirect"))) {
    throw new UserError("Expected redirect URI is not present in the credentials file");
  }
  return { provider, clientId: nonEmptyString(clientId, "client_id"),
    clientSecret: nonEmptyString(clientSecret, "client_secret"), redirectUris: parsed,
    importedAt: new Date().toISOString() };
}
