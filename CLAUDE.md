# Agent review contract — OAuth Compass

You are a verification agent. **Do not claim that Google, GitHub, or LinkedIn credentials can be automatically created.** Read README.md, SECURITY.md, docs/architecture.md and docs/credentials-format.md before code changes.

## Non-negotiable rules

1. TypeScript only; `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`; **never** use `any`, `@ts-ignore` or `as any`.
2. Do not add browser automation or scrape/authenticate to third-party consoles. Creation remains human-guided until a publicly documented official API is confirmed.
3. Never log, upload, print or commit secrets. Do not pass credentials in CLI arguments. Synthetic test secrets only.
4. Keep provider adapters isolated behind `OAuthProvider`; no provider-specific branches in core storage. Prefer small pure functions and dependency-free runtime.
5. Never overwrite user files silently. Treat filesystem paths, symlinks, pre-existing directories and permissions as security boundaries.
6. Add regression tests for every bug and a per-provider E2E CLI test for each new provider.
7. Inspect the provider's primary docs before changing callback rules, scopes, or onboarding instructions. Document the dated verification and exact URL.
8. Never claim that tests passed unless actually executed. If dependencies are unavailable, state that explicitly.

## Review gates (mandatory)

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run test:unit
pnpm run test:integration
pnpm run test:e2e
pnpm run coverage
pnpm run pack:check
```

## Audit checklist

- CLI: help, unknown commands, missing required flags, invalid providers, path errors, exit codes.
- Providers: Google `web` JSON shape; GitHub OAuth App vs GitHub App clarity; LinkedIn OIDC product access and required scopes.
- Validation: `unknown` JSON, empty/oversized fields, malicious URLs, redirect mismatch, HTTP allowed only on loopback, no open redirects.
- Storage: secrets not in output or exceptions; output path symlinks, directory permissions, atomicity, existing files, Windows ACL caveat, `.gitignore` behavior.
- Quality: strict typecheck, hermetic tests, windows/macos/linux CI, npm package `bin`, package content, SBOM/dependency audit if available.
- Docs: no unsupported claims, no real keys, correct source links and explicit manual steps.

## Expected agent deliverable

Produce `AUDIT_REPORT.md` with severity-ordered findings, reproduction steps, affected paths/lines, fixes, tests run and residual risks. Mark as BLOCKER any exposed secret, overwritten credentials or false automation claim. Do not change provider secrets or deploy/publish without explicit human approval.
