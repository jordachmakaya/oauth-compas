/**
 * @filemeta
 * type: adapter
 * title: Google Web client adapter
 * description: Declares Google OAuth client setup steps and scopes and parses downloaded web JSON into OAuthCredentials.
 * job_ref: legacy
 * functions: [parseCredentials, checkRedirectUri, parseWebClient]
 * classes: []
 * inputs: [unknown Google client JSON, expectedRedirectUri]
 * outputs: [OAuthCredentials, UserError]
 * relations:
 *   - imports: src/core/validation.ts
 *   - imports: src/core/errors.ts
 *   - calls: normalizeCredentials
 *   - used_by: src/providers/index.ts
 *   - tested_by: tests/unit/validation.test.ts
 *   - tested_by: tests/e2e/cli.test.ts
 * last_update: 2026-11-04
 */
import type { OAuthCredentials, OAuthProvider } from "../core/types.js";
import { normalizeCredentials, record } from "../core/validation.js";
import { UserError } from "../core/errors.js";
function checkRedirectUri(uri: string): void {
  const { hostname } = new URL(uri);
  const loopback = hostname === "127.0.0.1" || hostname === "[::1]";
  if (!loopback && (hostname.startsWith("[") || /^\d+\.\d+\.\d+\.\d+$/.test(hostname))) {
    throw new UserError("Google does not allow raw IP addresses in redirect URIs");
  }
}
function parseWebClient(fields: Record<string, unknown>, expectedRedirectUri?: string): OAuthCredentials {
  const credentials = normalizeCredentials("google", fields.client_id, fields.client_secret, fields.redirect_uris, expectedRedirectUri);
  credentials.redirectUris.forEach(checkRedirectUri);
  return credentials;
}
export const google: OAuthProvider = {
  id: "google", label: "Google", consoleUrl: "https://console.cloud.google.com/auth/clients",
  scopes: ["openid", "email", "profile"],
  checkRedirectUri,
  steps: [
    "Open Google Auth Platform. Select or create your Google Cloud project.",
    "Configure branding, audience and required consent screen information.",
    "Create an OAuth Client ID of type Web application.",
    "Add the displayed authorized JavaScript origin and redirect URI.",
    "Download the JSON immediately after creating the client: Google shows the full secret only once. Never paste it into a chat.",
  ],
  parseCredentials(input: unknown, expectedRedirectUri?: string) {
    const root = record(input, "Google JSON");
    if ("web" in root) {
      return parseWebClient(record(root.web, "Google web credentials"), expectedRedirectUri);
    }
    if (root.provider === "google") return parseWebClient(root, expectedRedirectUri);
    throw new UserError("Expected Google OAuth Web client JSON with a 'web' key");
  },
};
