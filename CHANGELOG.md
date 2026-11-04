# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-11-04

First public version. Real sign-ins on live provider consoles are not confirmed yet.

### Added

- Interactive setup with `oauth-compass` or `oauth-compass init`.
- Guided setup for Google, GitHub, LinkedIn and Amazon Cognito.
- Package `@hardmachinelabs/oauth-compass`, with an `oauth-compass` binary.
- `guide`, `import`, `doctor`, `providers` and `skill install` commands.
- Local JSON and `.env` output in `.oauth-init/`, with `.gitignore` handling.
- A bundled skill for AI coding agents, installed on request.
- Beginner guides for each provider.

### Security

- Existing credentials are never overwritten, and symlinked output paths are refused.
- Credential files are owner-only on Linux and macOS.
- Unknown options are rejected, so a typo cannot send secrets to the wrong folder.
- Unsafe redirect URLs are refused, and generated `.env` values cannot trigger shell expansion.
- No network access, telemetry or install scripts.
