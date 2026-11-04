# Verification report — 2026-11-04

Full findings, reproduction steps and sources are in [AUDIT_REPORT.md](AUDIT_REPORT.md).

## Executed

- `pnpm install --frozen-lockfile`, typecheck, unit, integration, E2E, coverage, `pack:check` and `pnpm audit` — **PASS** on Windows (Node 24.16.0) and in clean Linux containers (`node:22.23.4-slim`, `node:24.16.0-slim`), with `pnpm-lock.yaml` unchanged.
- Tests: 10/10 (5 unit, 1 integration, 4 E2E).
- Real tarball install on Windows via npm and pnpm — **PASS**.
- Real tarball install on Linux via `npm i -g`, local `.bin` and `npx` — **FAIL**: the binary does nothing and exits 0 (F-01).

## Not verified

- macOS has not been run locally.
- No live Google, GitHub or LinkedIn console or credentials were used. E2E tests use synthetic fixtures only.

## Release blockers

1. Fix F-01 and add a packed-install test.
2. Fix the High findings in AUDIT_REPORT.md.
3. Confirm CI is green on Linux, Windows and macOS.
4. Run manual provider smoke tests with disposable OAuth apps.
5. Add provenance and publishing controls.

No claim is made that remote OAuth apps can be created automatically. Nothing has been published to npm.
