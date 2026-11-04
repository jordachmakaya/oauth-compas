# OAuth Compass CLI

**A local-first, three-provider OAuth credential setup assistant** for Google, GitHub and LinkedIn. TypeScript (strict), Node.js, zero runtime dependencies. **No remote app creation, no telemetry, no provider credentials uploaded.**

> Status: `v0.1.0` candidate. CLI, validation, secure local export and offline E2E tests included. OAuth app creation still requires the official consoles. Package has **not** been published to npm.

## Why

Registering OAuth clients requires different consoles and credential formats. OAuth Compass generates a reliable setup checklist and normalizes locally obtained credentials into JSON + environment files. Unlike unsafe "one-click" scripts, it does not automate browser login or pretend to support unpublished provider APIs.

## Supported providers

| Provider | App type | Creation | Input | Recommended basic scopes |
| --- | --- | --- | --- | --- |
| Google | Web OAuth client | Google Auth Platform (manual) | Downloaded Google `web` JSON | `openid email profile` |
| GitHub | OAuth App | Developer settings (manual) | Locally assembled JSON | `read:user user:email` (as needed) |
| LinkedIn | Sign In with LinkedIn using OIDC | Developer Portal (manual, product access may be required) | Locally assembled JSON | `openid profile email` |

*GitHub Apps can be more appropriate than OAuth Apps for repository integrations.*

## Requirements and local development

Developing requires Node.js and pnpm. This repository uses pnpm only and is reproducible: Node.js is pinned in `.nvmrc` and `devEngines`, pnpm in `packageManager` (`corepack enable pnpm` activates it), direct dependencies in the `pnpm-workspace.yaml` catalog, and every transitive package in `pnpm-lock.yaml`. Consumers of the published CLI only need Node.js 22+. The npm registry package name is a **proposal**.

```bash
pnpm install --frozen-lockfile
pnpm run build
node dist/src/cli.js --help
pnpm test
```

After publishing the verified package, intended invocation:

```bash
npx oauth-compass-cli@latest --help
pnpm dlx oauth-compass-cli@latest --help
```

The executable binary is named `oauth-compass`:

```bash
npx --package oauth-compass-cli@latest oauth-compass providers
```

## Guided workflow (local development)

```bash
node dist/src/cli.js providers
node dist/src/cli.js guide google --origin http://localhost:3000 --redirect http://localhost:3000/api/auth/callback/google
node dist/src/cli.js guide github --origin http://localhost:3000 --redirect http://localhost:3000/api/auth/callback/github
node dist/src/cli.js guide linkedin --origin http://localhost:3000 --redirect http://localhost:3000/api/auth/callback/linkedin
```

Complete the displayed manual steps in the corresponding official provider console. For Google, download the Web application client JSON. For GitHub / LinkedIn, locally create the small JSON format described in [credential formats](docs/credentials-format.md).

```bash
node dist/src/cli.js import google --file ~/Downloads/client_secret.json --redirect http://localhost:3000/api/auth/callback/google
node dist/src/cli.js doctor google
```

Change `google` to `github` or `linkedin` for those providers. The importer creates `.oauth-init/<provider>.credentials.json` and `.oauth-init/<provider>.env` under the working directory, refuses overwrite, and adds `.oauth-init/` to `.gitignore`. It does **not** delete your input file.

### Generated `.env` example (fake values)

```dotenv
GOOGLE_CLIENT_ID="PLACEHOLDER_CLIENT_ID"
GOOGLE_CLIENT_SECRET="PLACEHOLDER_CLIENT_SECRET"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/callback/google"
```

Use these only on your application's **trusted server**, never in client-side Nuxt/Next code. The CLI does not implement an OAuth callback handler or token exchange.

## Commands

```text
oauth-compass providers
oauth-compass guide <google|github|linkedin> --origin URL --redirect URL
oauth-compass import <google|github|linkedin> --file PATH [--redirect URL] [--out DIRECTORY]
oauth-compass doctor <google|github|linkedin> [--out DIRECTORY]
oauth-compass --help
```

## Testing

```bash
pnpm run typecheck
pnpm run test:unit
pnpm run test:integration
pnpm run test:e2e
pnpm run coverage
pnpm run pack:check
```

These scripts run through [Turborepo](https://turborepo.com). Build and typecheck results are cached; tests and coverage are never cached, so a pass always means the tests ran. `pnpm run coverage` enforces the thresholds in `.c8rc.json` and writes `coverage/lcov.info` and an HTML report. Turborepo collects anonymous telemetry by default: run `pnpm exec turbo telemetry disable` to opt out locally (CI already disables it). The published CLI itself has no telemetry and zero runtime dependencies.

E2E tests invoke the **compiled CLI** as a child process for every provider, exercise guide → import → doctor → refusal to overwrite and assert that synthetic secrets are not printed. No external accounts, browsers or provider secrets are required. CI matrix includes Node 22/24 on Ubuntu, macOS and Windows.

## Architecture and security

See [architecture](docs/architecture.md), [security](SECURITY.md), [credential formats](docs/credentials-format.md) and [agent audit instructions](CLAUDE.md). Native Node.js `node:fs`, `node:test` and `node:child_process` keep runtime dependency count at zero. This MVP does not automatically create real provider apps or issue tokens.

## Official references

- [Google — OAuth 2.0 Web Server Apps](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google — OAuth client management](https://support.google.com/cloud/answer/15549257)
- [GitHub — Create OAuth App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)
- [GitHub — OAuth App security](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/best-practices-for-creating-an-oauth-app)
- [LinkedIn — Developer onboarding](https://www.linkedin.com/help/linkedin/answer/a526048)
- [LinkedIn — API product permissions](https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access)

## Contributing and license

Open a bug report with a synthetic reproduction, no credentials. Run typecheck + all tests before sending a PR. Security issues should be reported privately. MIT license; see LICENSE.
