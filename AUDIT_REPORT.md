# Audit report — OAuth Compass CLI

Date: 2026-11-04. Package: `@hardmachinelabs/oauth-compass@0.1.0` (renamed from `oauth-compass-cli`), published on 2026-11-04 as an early release. Line numbers refer to the current tree.

## Verdict

**Published as an early release; real sign-ins still to confirm.** All BLOCKER and High findings and all code-related Medium findings are fixed with regression tests, and CI passed on Linux, macOS and Windows. What remains is manual testing on real provider consoles, plus the items below. The findings below are open; fixed ones are listed under "Resolved during the audit".

- Exposed secrets: none found (pattern scan of the tree, plus CLI output checks with synthetic secrets).
- Overwritten credentials: none. `wx` writes refused every overwrite and symlink case tested.
- False automation claims: none. Code and docs consistently say that app creation is manual.
- No open finding is a BLOCKER. F-01 was treated as one because the documented install path reported success and did nothing.

## Claims checked against behaviour

| Claim (source) | Result | Evidence |
| --- | --- | --- |
| `npx @hardmachinelabs/oauth-compass` / installed `oauth-compass` works (README) | True on Linux and Windows after the F-01 fix; macOS covered by the packed-install test once CI runs it | `tests/e2e/packed-install.test.ts`, Docker |
| guide → import → doctor workflow (README) | True when run as `node dist/src/cli.js` | E2E, Docker, WSL |
| Refuses overwrite (README, architecture) | True | Linux sections 5, 6; integration test |
| Adds `.oauth-init/` to `.gitignore` before writing (architecture) | True, including on an import later refused for overwrite | F-12 |
| Does not delete the input file (README) | True | `rm` only targets output JSON; E2E reuses input |
| Owner-only permissions on POSIX (architecture) | True for files (0600, including umask 000); a pre-existing directory stays open | F-07 |
| Secrets not printed (architecture) | True for import, doctor and init; a secret typed in place of the provider or command is still echoed | F-16 |
| No network, no telemetry (README) | True for the CLI: no network API use in `src/` | grep. Turborepo, a dev tool only, has its own telemetry; see README |
| Zero runtime dependencies (README) | True | `dependencies` absent from packed manifest |
| Env interpolation is not performed (credentials-format) | True; generated values are also quoted against shell expansion | `tests/integration/doctor.test.ts` |
| `doctor` confirms a healthy setup (README) | True for local files; it never contacts a provider, and says so | README, `tests/integration/doctor.test.ts` |
| Creation is manual; no automatic credentials | True | Provider steps, docs, guide output |

## Findings

### Medium

**F-18 — Test suite cannot detect installation or storage defects.** `tests/`
Coverage reached 94.6% of lines while F-01 was present. A packed-install test now exists; there is still no symlink or directory-permission test in the repository. Note that adding comment headers raised the reported line figure to 96.8% with no new test; branch coverage (about 72%) is the more useful number. Thresholds in `.c8rc.json` are floors from these measurements, not a quality statement.

**F-20 — Unrelated script at the project root.** `codex-install-fixed.ps1`
A 71 KB installer for OpenAI Codex, referenced by nothing in the project. It has a signature block, but `Get-AuthenticodeSignature` returns `NotSigned`, and the name suggests hand edits. Static review found only OpenAI and GitHub download URLs, and it was **not executed**. It is not in the npm package and was deliberately left out of the commit; it stays untracked on disk for the owner to keep or delete. SHA-256: `4CAB8C639C629D22754B448DC418BC58658BEC5CDF2729044A419F2C56CEBDFF`.

### Low

- **F-07** `src/core/storage.ts:44` — A pre-existing `.oauth-init` at 0755 is accepted and `doctor` passes. Files stay 0600, so only file names are exposed. Fix: tighten or refuse it.
- **F-12** `src/commands/import-credentials.ts:32` — `.gitignore` is changed before the overwrite check, so a refused import still modifies it. The duplicate entries part is fixed.
- **F-13** `src/core/storage.ts:66` — Two sequential writes, not atomic. A write failure was rolled back correctly in testing, but a crash between writes would leave one file and block re-import (by inspection, not reproduced). Fix: temp file plus rename or link.
- **F-15** `src/commands/import-credentials.ts:29` — A UTF-8 BOM makes import fail with a syntax message. Some Windows tools write one, and GitHub/LinkedIn files are hand-made.
- **F-16** `src/main.ts:71`, `src/providers/index.ts:31` — Raw user input is echoed: a secret mistyped as a provider appears on stderr, and ANSI escapes are not stripped. There is no `--version`, and `--out` pointing at a missing path or a file blames `.gitignore`.
- **F-17** `src/providers/google.ts:39` — `import google` accepts an undocumented flat `{provider:"google",...}` shape, needed only by `doctor`. Fix: keep it out of the import path.
- **F-19** Docs — GitHub allows up to 10 callback URLs and advises `127.0.0.1` or `::1` over `localhost`, while examples use `localhost`. LinkedIn docs say to add callbacks via HTTPS, and whether it accepts the README's `http://localhost` callback is unverified. LinkedIn ignores query parameters on redirect URLs. The help text "never sent to this CLI maintainer" is odd wording.
- **F-21** Packaging — `.npmignore` is redundant with `files`. Published source maps point to `../../src`, which is not packaged. `@types/node` 25 is newer than the supported Node 22/24, so newer APIs would typecheck. No SBOM is committed.

## Resolved during the audit

| Item | Change |
| --- | --- |
| npm lockfile had no integrity hashes and `npm ci` was unverified | Replaced by `pnpm-lock.yaml` with integrity hashes; frozen install verified |
| Floating dependency and Node versions | pnpm catalog (strict), exact versions, `.nvmrc`, `devEngines`, exact CI matrix |
| CI actions on mutable tags, `*-latest` runners | Actions pinned to commit SHAs; runners named |
| `glob` / `minimatch` advisories via c8 (dev only) | Overrides to `glob` 14.0.3 and `minimatch` 11.0.4; `pnpm audit` clean; coverage still works |
| `VERIFICATION.md` out of date | Rewritten |
| **F-01 (BLOCKER)** installed binary was a silent no-op because the guard compared the invoked path with the real path | Guard removed: `src/cli.ts` always runs `main()` from `src/main.ts`. `tests/e2e/packed-install.test.ts` installs the tarball with npm in a path containing a space and `#`, then runs the binary |
| **F-02 (High)** `--redirect` was ignored in the `.env` | `OAuthCredentials.redirectUri` carries the selected URI to `envContent` |
| **F-03 (High)** redirect URIs were rewritten, hiding mismatches | Original string stored and compared exactly; whitespace and control characters rejected because `URL` would strip them |
| **F-04 (High)** `guide` printed origins with a trailing slash | `validateUrl` returns `url.origin` for origins |
| **F-05 (Medium)** unknown options silently ignored | Options allowlisted per command; unknown, repeated and stray arguments rejected without echoing values |
| **F-06 (Medium)** shell metacharacters active in `.env` | Control characters rejected; values with `$`, backtick, backslash or `"` single-quoted; unrepresentable values refused before any write |
| **F-08 (Medium)** URL validation looser than provider rules | Fragments, wildcards, traversal, empty userinfo and URLs in query parameters rejected; Google raw IP rule and Cognito localhost rule added through `checkRedirectUri` |
| **F-09 (Medium)** Google step omitted the one-time secret | Step text and guide updated |
| **F-10 (Medium)** provider map in core storage | Removed; the `.env` prefix derives from the provider ID |
| **F-11 (Medium)** `doctor` false PASS | Negated `.gitignore` entries and broken `.env` files now fail; one line per file; Windows prints an `INFO` line |
| **F-14 (Low)** no input size limit | Files over 1 MiB and non-regular paths refused before reading; oversize field message corrected |
| **F-22 (Medium)** `doctor` only checked that `.env` keys existed, reported by an external review | `doctor` compares the `.env` with the stored JSON without printing values; extra variables and any stored redirect URI stay valid |
| **F-23 (Low)** CLI steps pointed to `docs/` paths that do not exist in a consumer's project | Steps now give public URLs |
| **F-24 (Low)** `guide` told `npx` users to run an `oauth-compass` command they do not have | `guide` and the wizard now print the full `npx` command |
| Quick start showed contributor commands (`node dist/src/cli.js`) | README rewritten around `npx @hardmachinelabs/oauth-compass` with step-by-step usage |

Also added at the owner's request: Amazon Cognito (fourth provider), the interactive `init` wizard, OS and provider compatibility tables, provider guides, the `skill install` command and bundled agent skill (no `postinstall` hook, by design), Turborepo (tests never cached, per rule 8), c8 coverage, Dependabot, `@filemeta` headers. Each fix above was first shown to fail with its regression test on the unfixed code (6 failures) before the change. Provider rules behind F-03 and F-04 are the Google pages listed below, checked on 2026-11-04.

## Tests run on 2026-11-04

| Run | Environment | Result |
| --- | --- | --- |
| All gates on the original npm project | Windows, Node 24.16.0 | Pass, 10/10 tests, `npm audit` 0 |
| All gates after migration, clean install | Windows, Node 24.16.0 | Pass, 10/10 |
| All gates from a clean copy, frozen lockfile | Docker `node:22.23.4-slim` | Pass, lockfile unchanged |
| All gates from a clean copy, frozen lockfile | Docker `node:24.16.0-slim` | Pass, lockfile unchanged |
| Real tarball install and behaviour (F-01, F-07, symlinks) | Docker and WSL, Node 22.23.4 and 24.x | F-01 and F-07 reproduced; symlink refusals pass |
| Real tarball install | Windows via npm and pnpm | Works |
| Fixed tarball: `npm i -g`, local `.bin`, `npx`, `pnpm exec`, `pnpm dlx`, `pnpm add -g` | Docker, Node 22.23.4 and 24.16.0 | Works |
| All gates on the final code (70 tests) | Windows; Docker Node 22.23.4 and 24.16.0 | Pass; 1 symlink test is skipped on Windows |
| Provider guides: every command run verbatim against the tarball | Docker, Node 22.23.4 and 24.16.0 | Pass |

Symlink cases gave these results on Linux: live and dangling output links, symlinked `.oauth-init` and symlinked `.gitignore` were all refused with no write through the link. A dangling link gives only "Unexpected error". Non-root write refusal also held. Windows symlink cases could not run (`EPERM`). Tarballs used for F-01 predate the `@filemeta` headers and Turborepo, neither of which touches the guard logic.

## Provider documentation checked on 2026-11-04

- Google redirect rules, exact match: <https://developers.google.com/identity/protocols/oauth2/web-server> (first 100,000 of about 113,000 characters read)
- Google client secrets, origin rules: <https://support.google.com/cloud/answer/15549257>
- GitHub registration, 10 callback URLs: <https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app>
- GitHub redirect and loopback rules: <https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps>
- GitHub scopes (`read:user`, `user:email` confirmed): <https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps>
- LinkedIn OIDC scopes and product (`openid profile email` confirmed): <https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2>
- LinkedIn self-service access: <https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access>
- LinkedIn redirect rules: <https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow>
- LinkedIn app and Page association: <https://www.linkedin.com/help/linkedin/answer/a526048>
- GitHub OAuth app settings: <https://docs.github.com/en/apps/oauth-apps/maintaining-oauth-apps/modifying-an-oauth-app>
- GitHub secret handling: <https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/best-practices-for-creating-an-oauth-app>
- `gh auth login` (no OAuth App registration): <https://cli.github.com/manual/gh_auth_login>
- Skill locations: <https://code.claude.com/docs/en/skills> (first 100,000 of about 119,000 characters read)
- Skill format: <https://agentskills.io/specification>
- Cognito setup: <https://docs.aws.amazon.com/cognito/latest/developerguide/getting-started-user-pools.html>
- Cognito app clients and callback rules: <https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-client-apps.html>
- Cognito endpoints and issuer: <https://docs.aws.amazon.com/cognito/latest/developerguide/federation-endpoints.html>
- Login with Amazon (not added): <https://developer.amazon.com/docs/login-with-amazon/register-web.html>

## Residual risks

- macOS is covered by CI only, including the packed-install test.
- Cognito guide labels come from AWS documentation and were not checked in a live console. Login with Amazon was not added: its page does not show a local development option.
- No live provider console or real OAuth app was used, so provider acceptance of specific URLs is inferred from docs. Disposable-app smoke tests are still needed before release.
- `@hardmachinelabs/oauth-compass` returned 404 on the npm registry on 2026-11-04, and the owner's other packages use this scope. The first publish still needs an npm login with rights on the scope.
- `.gitignore` cannot protect files that are already tracked, and credential files are not encrypted (documented in SECURITY.md).
- No npm provenance, code scanning or branch protection is configured yet.

## Recommended order before publishing

1. Manual smoke tests with disposable apps on all four providers. Mark any untested provider as experimental in the README.
2. Enable npm 2FA, then add provenance and release controls.
3. Publish with `pnpm publish`, not `npm publish`: tested on 2026-11-04, `npm pack` leaves `catalog:` versions and `packageManager` in the published manifest.
