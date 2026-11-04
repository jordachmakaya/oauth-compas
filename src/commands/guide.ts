/**
 * @filemeta
 * type: service
 * title: Guide command
 * description: Validates origin and redirect URLs and returns the manual setup checklist text for a provider.
 * job_ref: legacy
 * functions: [createGuide]
 * classes: []
 * inputs: [provider, origin, redirectUri]
 * outputs: [guide text]
 * relations:
 *   - imports: src/providers/index.ts
 *   - imports: src/core/validation.ts
 *   - calls: validateUrl
 *   - used_by: src/main.ts
 *   - tested_by: tests/e2e/cli.test.ts
 * last_update: 2026-11-04
 */
import { getProvider } from "../providers/index.js";
import { validateUrl } from "../core/validation.js";
export function createGuide(provider: string, origin: string, redirectUri: string): string {
  const p = getProvider(provider);
  const normalizedOrigin = validateUrl(origin, "origin");
  const normalizedRedirect = validateUrl(redirectUri, "redirect");
  return [
    `\n${p.label} OAuth setup`, `Console: ${p.consoleUrl}`, "",
    `Authorized origin / homepage: ${normalizedOrigin}`,
    `Callback / redirect URL: ${normalizedRedirect}`, `Suggested scopes: ${p.scopes.join(" ")}`,
    "", ...p.steps.map((step, index) => `${index + 1}. ${step}`),
    "", "Then run:", `  oauth-compass import ${p.id} --file <local-credentials.json> --redirect ${normalizedRedirect}`,
    "", "Note: the CLI cannot create third-party OAuth apps or disclose client secrets automatically.", "",
  ].join("\n");
}
