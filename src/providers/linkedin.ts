/**
 * @filemeta
 * type: adapter
 * title: LinkedIn OIDC adapter
 * description: Declares Sign In with LinkedIn using OIDC setup steps and scopes and parses local JSON into OAuthCredentials.
 * job_ref: legacy
 * functions: [parseCredentials]
 * classes: []
 * inputs: [unknown credentials JSON, expectedRedirectUri]
 * outputs: [OAuthCredentials]
 * relations:
 *   - imports: src/core/validation.ts
 *   - calls: normalizeCredentials
 *   - used_by: src/providers/index.ts
 *   - tested_by: tests/e2e/cli.test.ts
 * last_update: 2026-11-04
 */
import type { OAuthProvider } from "../core/types.js";
import { normalizeCredentials, record } from "../core/validation.js";
export const linkedin: OAuthProvider = {
  id: "linkedin", label: "LinkedIn", consoleUrl: "https://www.linkedin.com/developers/apps",
  scopes: ["openid", "profile", "email"],
  steps: [
    "Create a LinkedIn app in the Developer Portal and associate a LinkedIn Page as required.",
    "Enable/confirm the Sign In with LinkedIn using OpenID Connect product access.",
    "In the Auth tab, register the displayed redirect URL.",
    "Copy Client ID and Client Secret to a LOCAL JSON file matching docs/credentials-format.md.",
    "Confirm the app is granted the openid/profile/email scopes before live sign-in testing.",
  ],
  parseCredentials(input: unknown, expectedRedirectUri?: string) {
    const data = record(input, "LinkedIn credentials");
    return normalizeCredentials("linkedin", data.client_id, data.client_secret, data.redirect_uris, expectedRedirectUri);
  },
};
