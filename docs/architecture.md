# Architecture / ADR-001

## Boundaries

`src/cli.ts` (argument parsing) → `commands/` (use cases) → `providers/` (provider metadata + credential adapters) → `core/` (validation and storage).

`OAuthProvider` is an interface with a discriminated provider ID, a console URL, guided setup steps and `parseCredentials(input: unknown)`; **no** provider has a silent remote-creation contract. This is intentional: none of the current MVP providers has a portable public workflow for fully creating conventional OAuth Web credentials.

## Trust model

- User controls credentials and filesystem; no network requests, telemetry, or OAuth flows.
- Provider IDs are allowlisted; JSON input is `unknown` before validation.
- Secrets never appear in normal stdout/stderr; no CLI flags accepting secrets.
- Output is write-once (`wx`) with owner-only permissions on POSIX; `.oauth-init/` is added to `.gitignore` prior to writing.
- Password/secret storage within a user-controlled workspace is not a secret manager. Production secrets should use a vault or environment injection.

## Future providers

Implement `OAuthProvider` and register it in `src/providers/index.ts`; add unit, integration, E2E coverage and verified links. Avoid speculatively automating UI sign-in or creating provider apps with unsupported APIs.

## Not included

Remote OAuth client creation, production token exchange, browser automation, consent screen APIs, or gcloud installation. Documented as manual steps. MVP is a functional secure configuration helper, not a full IdP provisioning system.
