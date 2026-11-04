# Audit report — OAuth Compass CLI

Date: 2026-11-04. Package: `oauth-compass-cli@0.1.0`, unpublished. Line numbers refer to the committed tree, including the `@filemeta` headers.

## Verdict

**Not ready for npm.** All review gates pass, but the installed binary does nothing on Linux: finding F-01. No source code was changed by this audit. The findings below are open unless listed under "Resolved during the audit".

- Exposed secrets: none found (pattern scan of the tree, plus CLI output checks with synthetic secrets).
- Overwritten credentials: none. `wx` writes refused every overwrite and symlink case tested.
- False automation claims: none. Code and docs consistently say that app creation is manual.
- `BLOCKER` is used for F-01 although it is outside the three classes in `CLAUDE.md`: the documented install path reports success and does nothing, so it blocks publication.

## Claims checked against behaviour

| Claim (source) | Result | Evidence |
| --- | --- | --- |
| `npx oauth-compass-cli` / installed `oauth-compass` works (README) | **FALSE on Linux**, works on Windows; macOS not tested | F-01 |
| guide → import → doctor workflow (README) | True when run as `node dist/src/cli.js` | E2E, Docker, WSL |
| Refuses overwrite (README, architecture) | True | Linux sections 5, 6; integration test |
| Adds `.oauth-init/` to `.gitignore` before writing (architecture) | True, but also on refused imports | F-12 |
| Does not delete the input file (README) | True | `rm` only targets output JSON; E2E reuses input |
| Owner-only permissions on POSIX (architecture) | True for files (0600, including umask 000); a pre-existing directory stays open | F-07 |
| Secrets not printed (architecture) | True for import and doctor; a secret mistyped as provider or command is echoed | F-16 |
| No network, no telemetry (README) | True for the CLI: 0 network API uses in `src/` | grep. Turborepo, a dev tool only, has its own telemetry; see README |
| Zero runtime dependencies (README) | True | `dependencies` absent from packed manifest |
| Env interpolation is not performed (credentials-format) | True of the CLI, misleading for consumers | F-06 |
| `doctor` confirms a healthy setup (README) | Partly: false PASS results | F-11 |
| Creation is manual; no automatic credentials | True | Provider steps, docs, guide output |

## Findings

### BLOCKER

**F-01 — Installed `oauth-compass` silently does nothing.** `src/cli.ts:78`

The main-module guard compares `import.meta.url`, which is the real path, with a URL built from `process.argv[1]`, which is the path as invoked. npm's `bin` entry is a symlink on POSIX, so the two differ, `main()` never runs and the process exits 0. An `import` writes nothing and reports nothing. Paths containing `#` or `%20` fail the same way, as does a Windows junction (reproduced).

Reproduce with the real tarball on Node 22.23.4 and 24.x, in Docker and WSL:

```sh
pnpm pack
npm install -g ./oauth-compass-cli-0.1.0.tgz
oauth-compass providers          # empty output, exit 0
node "$(npm root -g)/oauth-compass-cli/dist/src/cli.js" providers   # works
```

| Install path | Linux | Windows |
| --- | --- | --- |
| `npm i -g`, local `.bin`, `npx` | **no-op, exit 0** | `npx` works |
| `pnpm exec` | works (shim calls the real path) | works |
| `node <real path>` | works | works |

Fix: compare `realpathSync(process.argv[1])` with `fileURLToPath(import.meta.url)`, or use a thin bin file that always calls `main()`. Add a regression test that installs the packed tarball and runs the bin, and run it on all three CI systems. The current E2E suite calls `dist/src/cli.js` directly, which is why it cannot see this.

### High

**F-02 — `--redirect` is validated, then ignored in the `.env`.** `src/core/storage.ts:39`
Always writes `redirectUris[0]`. With URIs `[http://localhost:3000/a, https://app.example.com/b]` and `--redirect https://app.example.com/b`, the output is `GITHUB_REDIRECT_URI="http://localhost:3000/a"`: the wrong environment, and no warning. Fix: pass the selected URI to `envContent`.

**F-03 — Redirect URIs are rewritten before being stored.** `src/core/validation.ts:49`
`url.toString()` changes the value: `https://EXAMPLE.com:443/cb` becomes `https://example.com/cb`, and `http://localhost:3000` gains a `/`. Google requires an exact match, including case and trailing slash, so the stored value can differ from the registered one, and the mismatch check compares normalized values and hides it. Fix: validate with `URL` but store and compare the original string.

**F-04 — `guide` prints origins with a trailing slash.** `src/core/validation.ts:49`, shown by `src/commands/guide.ts`
`http://localhost:3000` is displayed as `http://localhost:3000/`. Google states that JavaScript origins cannot contain a path component. Rejection by the live console was not tested. Fix: print `url.origin`.

### Medium

**F-05 — Unknown flags are ignored, so a typo redirects secrets.** `src/cli.ts:33`
`import github --file in.json --oot /safe/dir` exits 0 and writes secrets to the current directory. Duplicate flags also pass silently (first wins). Fix: allowlist flags per command and reject the rest.

**F-06 — Generated `.env` keeps shell metacharacters active.** `src/core/storage.ts:36`
`JSON.stringify` does not escape `$` or backticks, so a value like `x$(touch PWNED)` runs if the file is `source`d, and tools such as dotenv-expand may interpolate it. Fix: reject control characters, and single-quote values containing `$`, backtick or backslash.

**F-08 — URL validation is looser than provider rules.** `src/core/validation.ts:39`
Accepted but disallowed by Google: empty fragment `https://example.com/cb#`, wildcard `https://*.example.com/cb`, traversal `/a/../cb` and `/%2e%2e/cb` (silently collapsed), raw IP `https://1.2.3.4/cb`. Open-redirect style parameters such as `?next=https://evil.example/` also pass. Fix: check the raw string for `#`, `*`, `..`, and add provider-level rules to the adapters.

**F-09 — Google step omits that the secret is shown only once.** `src/providers/google.ts:31`
Google shows and allows download of the full secret only at creation (clients created after June 2025; existing clients from November 2025). A user following the step later cannot obtain the JSON. Fix: tell users to download immediately at creation.

**F-10 — Provider-specific map in core storage (rule 4).** `src/core/storage.ts:28`
`providerKeys` lists the three providers in core, so a new provider means editing storage. Fix: add an `envPrefix` to `OAuthProvider`.

**F-11 — `doctor` reports false PASS results.** `src/commands/doctor.ts:37`, `src/core/storage.ts:75`
- `.oauth-init/` followed by `!.oauth-init/` in `.gitignore`: PASS, exit 0, although the entry is negated.
- A `.env` overwritten with garbage: PASS, exit 0. Only its existence is checked.
- On Windows, no permission check runs and the output still says PASS. A generated file showed inherited ACLs, including a `Modify` entry for a local group (`icacls`, in the temp directory). Fix: print an explicit "not verified on Windows" line, validate `.env`, and honour negation or call `git check-ignore`.

**F-18 — Test suite cannot detect installation or storage defects.** `tests/`
Coverage reached 94.6% of lines with F-01 present. There is no packed-install test and no symlink, directory-permission or `.env` content test. Note that adding comment headers raised the reported line figure to 96.8% with no new test; branch coverage (about 72%) is the more useful number. Thresholds in `.c8rc.json` are floors from these measurements, not a quality statement.

**F-20 — Unrelated script at the project root.** `codex-install-fixed.ps1`
A 71 KB installer for OpenAI Codex, referenced by nothing in the project. It has a signature block, but `Get-AuthenticodeSignature` returns `NotSigned`, and the name suggests hand edits. Static review found only OpenAI and GitHub download URLs, and it was **not executed**. It is not in the npm package and was deliberately left out of the commit; it stays untracked on disk for the owner to keep or delete. SHA-256: `4CAB8C639C629D22754B448DC418BC58658BEC5CDF2729044A419F2C56CEBDFF`.

### Low

- **F-07** `src/core/storage.ts:44` — A pre-existing `.oauth-init` at 0755 is accepted and `doctor` passes. Files stay 0600, so only file names are exposed. Fix: tighten or refuse it.
- **F-12** `src/commands/import-credentials.ts:32` — `.gitignore` is changed before the overwrite check, so a refused import still modifies it. Equivalent entries (`.oauth-init`, `/.oauth-init/`) get a duplicate line.
- **F-13** `src/core/storage.ts:66` — Two sequential writes, not atomic. A write failure was rolled back correctly in testing, but a crash between writes would leave one file and block re-import (by inspection, not reproduced). Fix: temp file plus rename or link.
- **F-14** `src/commands/import-credentials.ts:29`, `src/core/validation.ts:31` — No input size limit (64 MiB accepted). Leading/trailing spaces and NUL characters are kept in secrets. The oversize error says "non-empty".
- **F-15** `src/commands/import-credentials.ts:29` — A UTF-8 BOM makes import fail with a syntax message. Some Windows tools write one, and GitHub/LinkedIn files are hand-made.
- **F-16** `src/cli.ts:71`, `src/providers/index.ts:31` — Raw user input is echoed: a secret mistyped as a provider appears on stderr, and ANSI escapes are not stripped. There is no `--version`, `guide --help` fails, and `--out` pointing at a missing path or a file blames `.gitignore`.
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

Also added at the owner's request: Turborepo (tests never cached, per rule 8), c8 coverage, Dependabot, `@filemeta` headers.

## Tests run on 2026-11-04

| Run | Environment | Result |
| --- | --- | --- |
| All gates on the original npm project | Windows, Node 24.16.0 | Pass, 10/10 tests, `npm audit` 0 |
| All gates after migration, clean install | Windows, Node 24.16.0 | Pass, 10/10 |
| All gates from a clean copy, frozen lockfile | Docker `node:22.23.4-slim` | Pass, lockfile unchanged |
| All gates from a clean copy, frozen lockfile | Docker `node:24.16.0-slim` | Pass, lockfile unchanged |
| Real tarball install and behaviour (F-01, F-07, symlinks) | Docker and WSL, Node 22.23.4 and 24.x | F-01 and F-07 reproduced; symlink refusals pass |
| Real tarball install | Windows via npm and pnpm | Works |

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

## Residual risks

- macOS was never tested locally; only CI can cover it. F-01 is expected there, as npm links `bin` the same way.
- No live provider console or real OAuth app was used, so provider acceptance of specific URLs is inferred from docs. Disposable-app smoke tests are still needed before release.
- `pnpm dlx` and `pnpm add -g` were not tested.
- `oauth-compass-cli` and `oauth-compass` returned 404 on the npm registry on 2026-11-04. That suggests the names are free but reserves nothing.
- `.gitignore` cannot protect files that are already tracked, and credential files are not encrypted (documented in SECURITY.md).
- No npm provenance, code scanning or branch protection is configured yet.

## Recommended order before publishing

1. F-01, with the packed-install test (F-18).
2. F-02, F-03, F-04: wrong or rejected redirect values.
3. F-05, F-06, F-08, F-09, F-11.
4. F-10, then the Low items.
5. CI green on all three systems, then manual smoke tests with disposable apps.
