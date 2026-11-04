/**
 * @filemeta
 * type: type-definition
 * title: Provider and credential contracts
 * description: Declares provider ids and the OAuthCredentials and OAuthProvider contracts shared by core code and adapters.
 * job_ref: legacy
 * functions: []
 * classes: []
 * inputs: []
 * outputs: [providerIds, ProviderId, OAuthCredentials, OAuthProvider, SetupInput]
 * relations:
 *   - used_by: src/core/storage.ts
 *   - used_by: src/core/validation.ts
 *   - used_by: src/providers/index.ts
 *   - used_by: src/providers/google.ts
 *   - used_by: src/providers/github.ts
 *   - used_by: src/providers/linkedin.ts
 * last_update: 2026-11-04
 */
export const providerIds = ["google", "github", "linkedin"] as const;
export type ProviderId = (typeof providerIds)[number];
export type OAuthCredentials = Readonly<{
  provider: ProviderId;
  clientId: string;
  clientSecret: string;
  redirectUris: readonly string[];
  importedAt: string;
}>;
export type SetupInput = Readonly<{ origin: string; redirectUri: string }>;
export type OAuthProvider = Readonly<{
  id: ProviderId;
  label: string;
  consoleUrl: string;
  steps: readonly string[];
  scopes: readonly string[];
  parseCredentials(input: unknown, expectedRedirectUri?: string): OAuthCredentials;
}>;
