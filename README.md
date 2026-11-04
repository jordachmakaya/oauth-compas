<p align="center">
  <img src=".github/assets/logo.svg" alt="OAuth Compass logo" width="112">
</p>

# OAuth Compass CLI

[![Tests](https://img.shields.io/github/actions/workflow/status/jordachmakaya/oauth-compass/ci.yml?branch=main&label=tests)](https://github.com/jordachmakaya/oauth-compass/actions/workflows/ci.yml)
![Coverage gate](https://img.shields.io/badge/coverage%20gate-%E2%89%A590%25%20lines-brightgreen)
![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Node.js 22+](https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-managed-F69220?logo=pnpm&logoColor=white)
![Runtime dependencies: 0](https://img.shields.io/badge/runtime%20dependencies-0-blue)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**A local-first OAuth credential setup assistant** for Google, GitHub, LinkedIn and Amazon Cognito. It gives you a setup checklist, then turns the credentials you obtained into clean JSON and `.env` files.

**No remote app creation, no telemetry, no credentials uploaded.** You still create the OAuth app yourself in the provider's official console.

<p align="center">
  Created by <a href="https://github.com/jordachmakaya">Jordach M. Makaya</a>
</p>

<p align="center">
  <a href="docs/google.md"><img src="https://img.shields.io/badge/works%20with-Google-89b4fa?style=for-the-badge" alt="Works with Google"></a>
  <a href="docs/github.md"><img src="https://img.shields.io/badge/works%20with-GitHub-89b4fa?style=for-the-badge" alt="Works with GitHub"></a>
  <a href="docs/linkedin.md"><img src="https://img.shields.io/badge/works%20with-LinkedIn-89b4fa?style=for-the-badge" alt="Works with LinkedIn"></a>
  <a href="docs/cognito.md"><img src="https://img.shields.io/badge/works%20with-Amazon%20Cognito-89b4fa?style=for-the-badge" alt="Works with Amazon Cognito"></a>
</p>

<p align="center">
  <img src=".github/assets/demo.gif" alt="Interactive setup: choose a provider, confirm your URLs, then import and check a credentials file" width="820">
</p>

> Status: `v0.1.0` candidate, **not yet published to npm**. The `npx` commands below will work after the first release. To try it today, see [Development](#development).

## What it does and doesn't do

**OAuth Compass does:**

- Walk you through setup with a single interactive command.
- Print a setup checklist for each provider, with your own URLs.
- Validate the credentials file you provide (up to 1 MiB): format, HTTPS rules and redirect URL match.
- Write a JSON file and a `.env` file to `.oauth-init/`, with owner-only permissions on macOS and Linux.
- Add `.oauth-init/` to `.gitignore`, and refuse to overwrite existing credentials.
- Check the local result with `doctor`.
- Install a skill for AI coding agents, when you ask it to.

**OAuth Compass does not:**

- Create OAuth apps, client IDs or secrets. You do that in the provider's console.
- Open a browser or sign in to a provider.
- Send anything over the network. It has no telemetry and never contacts a provider.
- Prove that your credentials work. `doctor` checks local files only, so test a real sign-in in your app.
- Add sign-in to your app. It has no callback handler or token exchange, and issues no tokens.
- Encrypt your secrets or replace a secret manager. Use a vault or environment injection in production.
- Delete your input file. That's up to you.
- Run anything at install time. There is no `postinstall` script.

## Compatibility

### Providers

| Provider | App type | Created in | You provide | Suggested scopes | Guide |
| --- | --- | --- | --- | --- | --- |
| Google | Web OAuth client | Google Auth Platform (manual) | Downloaded `web` JSON | `openid email profile` | [Google guide](docs/google.md) |
| GitHub | OAuth App | Developer settings (manual) | Small local JSON file | `read:user user:email` (as needed) | [GitHub guide](docs/github.md) |
| LinkedIn | Sign In with LinkedIn using OIDC | Developer Portal (manual) | Small local JSON file | `openid profile email` | [LinkedIn guide](docs/linkedin.md) |
| Amazon Cognito | User pool app client | AWS console (manual) | Small local JSON file with an issuer | `openid email profile` | [Cognito guide](docs/cognito.md) |

GitHub Apps can be more appropriate than OAuth Apps for repository integrations. On AWS, Cognito is a user directory that you own: there is no "Sign in with AWS" for your users.

Each guide is written for beginners and lists what you need beforehand. You need no `gh`, `gcloud` or `aws` command-line tool.

### Operating systems

| OS | Support | Tested in CI on | Note |
| --- | --- | --- | --- |
| Linux | Yes | Ubuntu 24.04 | Credential files are owner-only (0600) |
| macOS | Yes | macOS 15 | Credential files are owner-only (0600) |
| Windows | Yes | Windows Server 2025 | Owner-only permissions are not applied; review NTFS ACLs separately |

Node.js 22 and 24 are tested on all three.

## Quick start

You only need Node.js 22+ and a provider account. In your project's main folder, run:

```bash
npx @hardmachinelabs/oauth-compass
```

The assistant asks for your provider and URLs, shows the setup checklist, then imports and checks your credentials file. It never asks for your secret. If your app isn't ready yet, leave the file path empty and come back later.

## Step by step

Prefer separate commands, for example in a script? These steps do the same thing. The examples use GitHub; replace `github` with another provider ID.

### Step 1: Check the CLI runs

```bash
npx @hardmachinelabs/oauth-compass providers
```

Expected result:

```text
google
github
linkedin
```

Using pnpm? Replace `npx` with `pnpm dlx`. For regular use, run `npm install -g @hardmachinelabs/oauth-compass` once, then use the shorter `oauth-compass` command.

### Step 2: Get your setup checklist

Pass your app's URL and its OAuth callback URL.

```bash
npx @hardmachinelabs/oauth-compass guide github --origin http://localhost:3000 --redirect http://localhost:3000/api/auth/callback/github
```

Expected result:

```text
GitHub OAuth setup
Console: https://github.com/settings/developers

Authorized origin / homepage: http://localhost:3000
Callback / redirect URL: http://localhost:3000/api/auth/callback/github
Suggested scopes: read:user user:email

1. Open Settings > Developer settings > OAuth Apps > New OAuth App.
2. Register the public homepage URL and the displayed callback URL.
3. Generate a client secret in the OAuth App settings.
4. Save credentials in a LOCAL JSON file. Format: https://github.com/jordachmakaya/oauth-compass/blob/main/docs/github.md
5. GitHub Apps may be a better choice for repository integrations; this MVP targets OAuth Apps.

Then run:
  npx @hardmachinelabs/oauth-compass import github --file <local-credentials.json> --redirect http://localhost:3000/api/auth/callback/github

Note: the CLI cannot create third-party OAuth apps or disclose client secrets automatically.
```

### Step 3: Create the app and save its credentials

This step is manual. Follow the checklist in the provider's console.

- **Google:** download the client JSON right after creating the client. Google shows the full secret only at creation.
- **GitHub, LinkedIn and Cognito:** copy the values into a local file in your home folder, for example `github-oauth.json`. Never commit this file.

```json
{"client_id":"PLACEHOLDER_ID","client_secret":"PLACEHOLDER_SECRET","redirect_uris":["http://localhost:3000/api/auth/callback/github"]}
```

Details are in the [provider guides](#providers) and [credential formats](docs/credentials-format.md).

### Step 4: Import the credentials

Run this from your project's root folder.

```bash
npx @hardmachinelabs/oauth-compass import github --file "$HOME/github-oauth.json" --redirect http://localhost:3000/api/auth/callback/github
```

Expected result:

```text
Credentials stored locally:
  /your/project/.oauth-init/github.credentials.json
  /your/project/.oauth-init/github.env
Never commit these files.
```

The CLI also adds `.oauth-init/` to `.gitignore`. It never overwrites existing credentials and does not delete your input file, so delete `github-oauth.json` yourself.

### Step 5: Check the result

```bash
npx @hardmachinelabs/oauth-compass doctor github
```

Expected result:

```text
PASS .oauth-init/ excluded by .gitignore
PASS /your/project/.oauth-init/github.credentials.json exists
PASS /your/project/.oauth-init/github.env exists
```

`doctor` also checks that the `.env` matches the JSON file, without printing either. It looks at local files only, so it cannot prove that the provider accepts your credentials. On Windows, an extra `INFO` line reminds you that file permissions are not checked.

### Step 6: Use the values in your app

`.oauth-init/github.env` contains:

```dotenv
GITHUB_CLIENT_ID="PLACEHOLDER_ID"
GITHUB_CLIENT_SECRET="PLACEHOLDER_SECRET"
GITHUB_REDIRECT_URI="http://localhost:3000/api/auth/callback/github"
```

Use these only on your application's **trusted server**, never in client-side code. The CLI does not implement an OAuth callback handler or token exchange.

## Commands

The table uses the short `oauth-compass` name. If you did not install it globally, replace it with `npx @hardmachinelabs/oauth-compass`.

| Command | What it does | Expected result | Exit code |
| --- | --- | --- | --- |
| `oauth-compass` | Starts the interactive setup in a terminal, and prints help otherwise | Questions, then checklist, import and checks | `0` when complete or stopped, `1` on failure |
| `oauth-compass init` | Starts the interactive setup | Same as above | Same as above |
| `oauth-compass providers` | Lists supported providers | One provider per line | `0` |
| `oauth-compass guide <provider> --origin URL --redirect URL` | Prints the manual setup checklist | Console link, URLs, scopes and numbered steps | `0` |
| `oauth-compass import <provider> --file PATH [--redirect URL] [--out DIRECTORY]` | Validates a local JSON file and writes the credential files | Paths of the two created files | `0` |
| `oauth-compass doctor <provider> [--out DIRECTORY]` | Checks `.gitignore`, the files, their permissions, and that they match each other | One `PASS` or `FAIL` line per check | `0` if all pass, `1` otherwise |
| `oauth-compass skill install [--out DIRECTORY]` | Installs the AI agent skill | Path of the created `SKILL.md` | `0` |
| `oauth-compass --help` | Shows usage | Command list | `0` |

`<provider>` is `google`, `github`, `linkedin` or `cognito`.

Good to know:

- `--out` sets the folder that receives `.oauth-init/`. It defaults to the current folder.
- `--redirect` on `import` must match a URI in your file exactly. The `.env` uses that URI, or the first one in the file if you omit it.
- Any error prints `Error: ...` on stderr and exits with `1`. For example, a second import prints `Error: Refusing to overwrite ...`.
- Unknown options, repeated options and extra arguments are rejected, so a typo can't send your secrets to the wrong folder.
- Unsafe redirect URLs are refused: fragments, wildcards, path traversal, embedded credentials, or another URL in the query. Google also refuses raw IP addresses.
- Never pass secrets as command-line arguments.

<p align="center">
  <img src=".github/assets/checks.gif" alt="doctor passes, a mistyped option is rejected, and an existing credential is not overwritten" width="820">
</p>

## Using an AI coding agent

OAuth Compass includes a skill that teaches agents such as Claude Code to run the step-by-step workflow safely: the agent runs local commands, never asks for your secret, and leaves the console steps to you. It follows the [Agent Skills](https://agentskills.io) format.

The skill ships inside the package, but nothing is written until you ask. Run this from your project's root folder:

```bash
npx @hardmachinelabs/oauth-compass skill install
```

Expected result:

```text
Agent skill installed:
  /your/project/.claude/skills/oauth-compass/SKILL.md
```

<p align="center">
  <img src=".github/assets/agent-skill.gif" alt="skill install creates SKILL.md, whose rules forbid agents from handling secrets" width="820">
</p>

Commit that file to share the skill with your team. To make it available in all your projects, add `--out "$HOME"`. Existing skill files are never overwritten. Other agents may read skills from a different folder: copy `SKILL.md` there.

## Why

Registering OAuth clients means dealing with different consoles and credential formats. OAuth Compass gives you a reliable checklist and normalizes the credentials you obtained locally. Unlike "one-click" scripts, it does not automate browser login or pretend to support unpublished provider APIs.

## Development

For contributors working from a clone. Users of the published CLI do not need any of this.

```bash
pnpm install --frozen-lockfile
pnpm run build
node dist/src/cli.js --help
```

This repository uses pnpm only and is reproducible: Node.js is pinned in `.nvmrc` and `devEngines`, pnpm in `packageManager` (`corepack enable pnpm` activates it), direct dependencies in the `pnpm-workspace.yaml` catalog, and every transitive package in `pnpm-lock.yaml`.

The README demos are recorded from the packed tarball with [VHS](https://github.com/charmbracelet/vhs). To refresh one, run its `.tape` file from `.github/assets/`.

### Testing

```bash
pnpm run typecheck
pnpm run test:unit
pnpm run test:integration
pnpm run test:e2e
pnpm run coverage
pnpm run pack:check
```

These scripts run through [Turborepo](https://turborepo.com). Build and typecheck results are cached; tests and coverage are never cached, so a pass always means the tests ran. `pnpm run coverage` enforces the thresholds in `.c8rc.json` and writes `coverage/lcov.info` and an HTML report. Turborepo collects anonymous telemetry by default: run `pnpm exec turbo telemetry disable` to opt out locally (CI already disables it). The published CLI itself has no telemetry and zero runtime dependencies.

E2E tests run the compiled CLI for every provider and assert that synthetic secrets are not printed. A separate test installs the packed tarball like a consumer and runs the `oauth-compass` binary. No external accounts, browsers or provider secrets are required. CI covers Node 22 and 24 on Ubuntu, macOS and Windows.

### Releasing

Maintainers publish with pnpm, never with `npm publish`: only pnpm replaces the `catalog:` versions and removes `packageManager` from the published `package.json`. `publishConfig` already makes this scoped package public.

```bash
pnpm publish --dry-run
pnpm publish
```

Before a release, update [CHANGELOG.md](CHANGELOG.md), confirm that CI is green, and run a real sign-in with a disposable app on each provider.

## Architecture and security

See [architecture](docs/architecture.md), [security](SECURITY.md), [credential formats](docs/credentials-format.md), the [audit report](AUDIT_REPORT.md) and [agent audit instructions](CLAUDE.md). This project does not create real provider apps or issue tokens.

## Official references

- [Google — OAuth 2.0 Web Server Apps](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google — OAuth client management](https://support.google.com/cloud/answer/15549257)
- [GitHub — Create OAuth App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)
- [GitHub — OAuth App security](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/best-practices-for-creating-an-oauth-app)
- [LinkedIn — Developer onboarding](https://www.linkedin.com/help/linkedin/answer/a526048)
- [LinkedIn — API product permissions](https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access)

## Author

Created and maintained by [Jordach M. Makaya](https://github.com/jordachmakaya).

## Trademarks

OAuth Compass is an independent project. It is not affiliated with, endorsed by or sponsored by Google, GitHub, LinkedIn or Amazon. Provider names are trademarks of their respective owners and are used only to say which services this tool works with.

## Contributing and license

Open a bug report with a synthetic reproduction, no credentials. Run typecheck and all tests before sending a PR. Report security issues privately. MIT license; see [LICENSE](LICENSE).
