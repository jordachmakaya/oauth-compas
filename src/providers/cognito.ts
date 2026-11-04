/**
 * @filemeta
 * type: adapter
 * title: Amazon Cognito adapter
 * description: Declares Amazon Cognito user pool setup steps and scopes and parses local JSON with an issuer into OAuthCredentials.
 * job_ref: untracked
 * functions: [parseCredentials, checkRedirectUri, parseIssuer]
 * classes: []
 * inputs: [unknown credentials JSON, expectedRedirectUri]
 * outputs: [OAuthCredentials, UserError]
 * relations:
 *   - imports: src/core/validation.ts
 *   - imports: src/core/errors.ts
 *   - imports: src/core/types.ts
 *   - calls: normalizeCredentials
 *   - used_by: src/providers/index.ts
 *   - tested_by: tests/unit/cognito.test.ts
 *   - tested_by: tests/e2e/cli.test.ts
 * last_update: 2026-11-04
 */
import type { OAuthProvider } from "../core/types.js";
import { UserError } from "../core/errors.js";
import { normalizeCredentials, record } from "../core/validation.js";

function checkRedirectUri(uri: string): void {
  const url = new URL(uri);
  if (url.protocol === "http:" && url.hostname !== "localhost") {
    throw new UserError("Amazon Cognito allows HTTP only for http://localhost");
  }
}

function parseIssuer(value: unknown): string {
  const pattern = /^https:\/\/(?:issuer-)?cognito-idp\.[a-z0-9-]+\.amazonaws\.com\/[a-z0-9-]+_[A-Za-z0-9]+$/;
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new UserError("issuer must look like https://cognito-idp.<region>.amazonaws.com/<user pool id>");
  }
  return value;
}

export const cognito: OAuthProvider = {
  id: "cognito", label: "Amazon Cognito", consoleUrl: "https://console.aws.amazon.com/cognito/v2/idp/user-pools",
  scopes: ["openid", "email", "profile"],
  checkRedirectUri,
  steps: [
    "Open the Amazon Cognito console and choose Create user pool.",
    "Choose Traditional web application: only this type creates a client secret, and it cannot be added later.",
    "Choose sign-in options and add the displayed callback URL as the return URL, then create the application.",
    "Copy the client ID and client secret from the app client, and note the user pool ID and Region.",
    "Save credentials in a LOCAL JSON file matching docs/cognito.md, with the issuer built from the Region and user pool ID.",
  ],
  parseCredentials(input: unknown, expectedRedirectUri?: string) {
    const data = record(input, "Cognito credentials");
    const issuer = parseIssuer(data.issuer);
    const credentials = normalizeCredentials("cognito", data.client_id, data.client_secret, data.redirect_uris, expectedRedirectUri);
    credentials.redirectUris.forEach(checkRedirectUri);
    return { ...credentials, extras: { ISSUER: issuer } };
  },
};
