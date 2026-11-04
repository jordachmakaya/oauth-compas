/**
 * @filemeta
 * type: utility
 * title: User-facing error type
 * description: Defines UserError, the only error type whose message the CLI prints to stderr.
 * job_ref: legacy
 * functions: []
 * classes: [UserError]
 * inputs: [message]
 * outputs: [UserError]
 * relations:
 *   - used_by: src/main.ts
 *   - used_by: src/commands/import-credentials.ts
 *   - used_by: src/commands/install-skill.ts
 *   - used_by: src/commands/init.ts
 *   - used_by: src/core/storage.ts
 *   - used_by: src/core/validation.ts
 *   - used_by: src/providers/google.ts
 *   - used_by: src/providers/cognito.ts
 *   - used_by: src/providers/index.ts
 * last_update: 2026-11-04
 */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}
