# src/core

This folder contains provider-independent validation, storage and contracts.

| File | Role | Job Ref | Tests |
|---|---|---|---|
| `errors.ts` | Defines `UserError`, the only error message printed to stderr. | legacy | none directly |
| `storage.ts` | Builds output paths and `.env` content, writes credential files, updates `.gitignore`. | legacy | `tests/integration/storage.test.ts` |
| `types.ts` | Declares provider ids and the `OAuthCredentials` and `OAuthProvider` contracts. | legacy | none (types) |
| `validation.ts` | Validates unknown JSON fields and URLs, returns normalized `OAuthCredentials`. | legacy | `tests/unit/validation.test.ts` |

## Relations

- `storage.ts` and `validation.ts` import `types.ts` and `errors.ts`.
- `validation.ts` is used by `src/commands/guide.ts` and every provider adapter.
