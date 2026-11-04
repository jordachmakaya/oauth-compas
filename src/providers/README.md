# src/providers

This folder contains one `OAuthProvider` adapter per provider and their registry.

| File | Role | Job Ref | Tests |
|---|---|---|---|
| `github.ts` | Declares GitHub OAuth App setup steps and parses local JSON. | legacy | `tests/integration/storage.test.ts`, `tests/e2e/cli.test.ts` |
| `google.ts` | Declares Google OAuth client setup steps and parses downloaded web JSON. | legacy | `tests/unit/validation.test.ts`, `tests/e2e/cli.test.ts` |
| `index.ts` | Registers adapters and resolves an allowlisted provider id. | legacy | `tests/unit/validation.test.ts` |
| `cognito.ts` | Declares Amazon Cognito user pool setup steps and parses local JSON with an issuer. | untracked | `tests/unit/cognito.test.ts`, `tests/e2e/cli.test.ts` |
| `linkedin.ts` | Declares Sign In with LinkedIn using OIDC setup steps and parses local JSON. | legacy | `tests/e2e/cli.test.ts` |

## Relations

- Every adapter imports `src/core/validation.ts`.
- A new provider is added to `index.ts` and needs its own E2E case in `tests/e2e/cli.test.ts`.
