# Provider monitoring

For maintainers. OAuth Compass never contacts a provider, so a provider change cannot crash the CLI. It can make our instructions wrong, so this check watches for that.

## What runs and when

`.github/workflows/provider-check.yml` has two schedules:

| Schedule | What it does | Issue label |
| --- | --- | --- |
| 1st of each month | Runs the automated check | `provider-drift` |
| 1st of January and July | Opens a checklist to review the consoles by hand | `provider-review` |

## What the automated check covers

| Check | Example of what it catches |
| --- | --- |
| Links in the provider guides | A documentation page was removed |
| Google and LinkedIn OIDC metadata | The issuer, authorization endpoint or a scope changed |
| Key phrases in official docs | A rule our guides rely on was reworded or removed |

## What it cannot see

- **Provider consoles.** They need a login, and browser automation is forbidden by `CLAUDE.md`. A renamed button will not raise an alert, which is why the 6-month manual review exists.
- **OIDC metadata for GitHub and Cognito.** GitHub OAuth Apps have no public metadata document, and Cognito has one per user pool. Their documentation is covered by the link and phrase checks.
- **Whether real sign-ins work.** Only a test with a disposable app proves that.

## When an issue is opened

| Result | Outcome |
| --- | --- |
| Everything matches | Nothing happens |
| A link is gone (HTTP 404 or 410), metadata changed, or a phrase is missing | One issue is opened |
| The same problem is found again while the issue is open | A comment is added, no duplicate |
| A page blocks the request (401, 403, 429, 5xx or timeout) | Listed as "could not be checked", no issue on its own |
| Nothing could be verified at all, or the check crashes | An issue is opened, because a check that verifies nothing is broken |

## When you receive an issue

1. Open the official page named in the issue.
2. If the provider changed something, update the guide in `docs/` and the adapter in `src/providers/`, and record the date and source.
3. If the provider only reworded a page, update the expectation in `scripts/provider-checks.ts`.
4. Close the issue.

## Running it

Locally:

```bash
pnpm run build
node dist/scripts/check-providers.js
```

On GitHub, open **Actions**, then **Provider check**, then **Run workflow**. Tick **simulate_failure** to open a test issue and prove that alerts work.

GitHub can disable scheduled workflows in a public repository after 60 days without activity. Confirm in **Actions** that the workflow is still enabled when the 6-month review arrives.

## Changing what is checked

Add or edit expectations in `scripts/provider-checks.ts`. Pick a phrase that an instruction really depends on, and say why in the `why` field. Tests in `tests/unit/provider-checks.test.ts` use a fake network, so they never depend on provider websites.
