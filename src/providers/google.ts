/**
 * @filemeta
 * type: adapter
 * title: Google Web client adapter
 * description: Declares Google OAuth client setup steps and scopes and parses downloaded web JSON into OAuthCredentials.
 * job_ref: legacy
 * functions: [parseCredentials]
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
import type { OAuthProvider } from "../core/types.js";
import { normalizeCredentials, record } from "../core/validation.js";
import { UserError } from "../core/errors.js";
export const google: OAuthProvider = {
  id: "google", label: "Google", consoleUrl: "https://console.cloud.google.com/auth/clients",
  scopes: ["openid", "email", "profile"],
  steps: [
    "Open Google Auth Platform. Select or create your Google Cloud project.",
    "Configure branding, audience and required consent screen information.",
    "Create an OAuth Client ID of type Web application.",
    "Add the displayed authorized JavaScript origin and redirect URI.",
    "Download the JSON from Google Cloud Console; never paste the secret into a chat.",
  ],
  parseCredentials(input: unknown, expectedRedirectUri?: string) {
    const root = record(input, "Google JSON");
    if ("web" in root) {
      const web = record(root.web, "Google web credentials");
      return normalizeCredentials("google", web.client_id, web.client_secret, web.redirect_uris, expectedRedirectUri);
    }
    if (root.provider === "google") {
      return normalizeCredentials("google", root.client_id, root.client_secret, root.redirect_uris, expectedRedirectUri);
    }
    throw new UserError("Expected Google OAuth Web client JSON with a 'web' key");
  },
};
