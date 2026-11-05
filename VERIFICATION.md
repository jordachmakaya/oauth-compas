# Verification report — 2026-11-04

Full findings, reproduction steps and sources are in [AUDIT_REPORT.md](AUDIT_REPORT.md).

## Executed

- `pnpm install --frozen-lockfile`, typecheck, unit, integration, E2E, coverage, `pack:check` and `pnpm audit` — **PASS** on Windows (Node 24.16.0) and in clean Linux containers (`node:22.23.4-slim`, `node:24.16.0-slim`), with `pnpm-lock.yaml` unchanged.
- Tests: 70/70 on Linux; on Windows 1 symlink test is skipped because creating symlinks needs extra privileges.
- Every command in the four provider guides, run verbatim against the packed tarball on Linux.
- Published `@hardmachinelabs/oauth-compass@0.1.0`, installed from the npm registry in clean Linux containers (Node 22.23.4 and 24.16.0) and on Windows — **PASS** for `npx`, `npm i -g` and `pnpm dlx` on Linux, and `npx` on Windows.
- Real tarball install on Windows and Linux via npm and pnpm, including `pnpm dlx` and `pnpm add -g` on Linux — **PASS** after the F-01 fix. Before it, the binary did nothing on Linux and exited 0.

## Not verified

- macOS is covered by CI only.
- No live Google, GitHub, LinkedIn or AWS console or credentials were used. E2E tests use synthetic fixtures only.

## Release blockers

1. Run manual provider smoke tests with disposable OAuth apps on all four providers.
2. Add provenance and publishing controls before the next release.
3. Publish with `pnpm publish`, never `npm publish`, then approve the staged release on npm if asked.

No claim is made that remote OAuth apps can be created automatically.
