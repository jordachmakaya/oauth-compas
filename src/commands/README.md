# src/commands

This folder contains the use cases called by `src/cli.ts`.

| File | Role | Job Ref | Tests |
|---|---|---|---|
| `doctor.ts` | Checks `.gitignore`, credential file permissions and stored JSON for a provider. | legacy | `tests/e2e/cli.test.ts` |
| `guide.ts` | Returns the manual setup checklist text for a provider. | legacy | `tests/e2e/cli.test.ts` |
| `import-credentials.ts` | Validates a local JSON file and writes credential files. | legacy | `tests/e2e/cli.test.ts` |

## Relations

- All three files resolve their provider through `src/providers/index.ts`.
- `doctor.ts` and `import-credentials.ts` import `src/core/storage.ts`.
- `guide.ts` imports `src/core/validation.ts`.
