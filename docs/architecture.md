# Architecture / ADR-001

## Boundaries

`src/cli.ts` (executable, always runs `main`) → `src/main.ts` (argument checks and dispatch) → `commands/` (use cases, including the `init` wizard) → `providers/` (provider metadata + credential adapters) → `core/` (validation and storage).

`OAuthProvider` is an interface with a discriminated provider ID, a console URL, guided setup steps and `parseCredentials(input: unknown)`; **no** provider has a silent remote-creation contract. This is intentional: Google, GitHub and LinkedIn have no portable public workflow for fully creating conventional OAuth Web credentials. Amazon Cognito does have a public API (`CreateUserPoolClient`), and it is deliberately not used: calling it would make this tool handle AWS credentials and contact the network. Adapters may add provider rules through the optional `checkRedirectUri`, and extra values through `extras`, without changing core storage.

## Trust model

- User controls credentials and filesystem; no network requests, telemetry, or OAuth flows.
- Provider IDs are allowlisted; JSON input is `unknown` before validation.
- Secrets never appear in normal stdout/stderr; no CLI flags accepting secrets. Unknown options, repeated options and stray arguments are rejected, and stray values are not echoed.
- Output is write-once (`wx`) with owner-only permissions on POSIX; `.oauth-init/` is added to `.gitignore` prior to writing.
- Password/secret storage within a user-controlled workspace is not a secret manager. Production secrets should use a vault or environment injection.

## Agent skill

`skills/oauth-compass/SKILL.md` ships in the package. `oauth-compass skill install` copies it to `.claude/skills/oauth-compass/` on request. A `postinstall` hook is deliberately not used: it would write outside the project without consent, and package managers may block it.

## Future providers

Implement `OAuthProvider` and register it in `src/providers/index.ts`; add unit, integration, E2E coverage and verified links. Avoid speculatively automating UI sign-in or creating provider apps with unsupported APIs.

## Not included

Remote OAuth client creation, production token exchange, browser automation, consent screen APIs, or gcloud installation. Documented as manual steps. MVP is a functional secure configuration helper, not a full IdP provisioning system.
