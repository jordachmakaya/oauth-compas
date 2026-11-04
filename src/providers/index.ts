/**
 * @filemeta
 * type: utility
 * title: Provider registry
 * description: Registers the provider adapters and resolves an allowlisted provider id to its OAuthProvider or throws UserError.
 * job_ref: legacy
 * functions: [getProvider]
 * classes: []
 * inputs: [id]
 * outputs: [OAuthProvider, providerIds, UserError]
 * relations:
 *   - imports: src/providers/google.ts
 *   - imports: src/providers/github.ts
 *   - imports: src/providers/linkedin.ts
 *   - imports: src/providers/cognito.ts
 *   - imports: src/core/types.ts
 *   - used_by: src/main.ts
 *   - used_by: src/commands/doctor.ts
 *   - used_by: src/commands/guide.ts
 *   - used_by: src/commands/import-credentials.ts
 *   - used_by: src/commands/init.ts
 *   - tested_by: tests/unit/validation.test.ts
 * last_update: 2026-11-04
 */
import { google } from "./google.js";
import { github } from "./github.js";
import { linkedin } from "./linkedin.js";
import { cognito } from "./cognito.js";
import { providerIds, type OAuthProvider, type ProviderId } from "../core/types.js";
import { UserError } from "../core/errors.js";
const providerMap: Readonly<Record<ProviderId, OAuthProvider>> = { google, github, linkedin, cognito };
export function getProvider(id: string): OAuthProvider {
  if (!providerIds.some((item) => item === id)) {
    throw new UserError(`Unknown provider '${id}'. Choose: ${providerIds.join(", ")}`);
  }
  return providerMap[id as ProviderId];
}
export { providerIds };
