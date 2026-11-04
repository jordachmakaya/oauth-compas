/**
 * @filemeta
 * type: adapter
 * title: GitHub OAuth App adapter
 * description: Declares GitHub OAuth App setup steps and scopes and parses local JSON into OAuthCredentials.
 * job_ref: legacy
 * functions: [parseCredentials]
 * classes: []
 * inputs: [unknown credentials JSON, expectedRedirectUri]
 * outputs: [OAuthCredentials]
 * relations:
 *   - imports: src/core/validation.ts
 *   - calls: normalizeCredentials
 *   - used_by: src/providers/index.ts
 *   - tested_by: tests/integration/storage.test.ts
 *   - tested_by: tests/e2e/cli.test.ts
 * last_update: 2026-11-04
 */
import type { OAuthProvider } from "../core/types.js";
import { normalizeCredentials, record } from "../core/validation.js";
export const github: OAuthProvider = {
  id: "github", label: "GitHub", consoleUrl: "https://github.com/settings/developers",
  scopes: ["read:user", "user:email"],
  steps: [
    "Open Settings > Developer settings > OAuth Apps > New OAuth App.",
    "Register the public homepage URL and the displayed callback URL.",
    "Generate a client secret in the OAuth App settings.",
    "Save credentials in a LOCAL JSON file matching docs/credentials-format.md.",
    "GitHub Apps may be a better choice for repository integrations; this MVP targets OAuth Apps.",
  ],
  parseCredentials(input: unknown, expectedRedirectUri?: string) {
    const data = record(input, "GitHub credentials");
    return normalizeCredentials("github", data.client_id, data.client_secret, data.redirect_uris, expectedRedirectUri);
  },
};
