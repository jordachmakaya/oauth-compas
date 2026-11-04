# Security policy

Report vulnerabilities privately using GitHub private vulnerability reporting when a repository is published. Do not include live OAuth secrets in issues or logs.

## Threat model

- Files contain credentials: commit exclusion and restricted POSIX permissions reduce accidents; they do not encrypt at rest.
- Root, compromised endpoint, malicious npm installation, backup sync or filesystem ACLs remain outside the CLI's protection.
- `.gitignore` is not sufficient to protect previously tracked files. Use `git rm --cached` and rotate compromised credentials.
- Never pass secrets in arguments (visible in process listings) or put them in a frontend bundle.
- After using a raw GitHub/LinkedIn input file, delete or secure that source file too.
- On Windows, POSIX mode 0600 is not an ACL guarantee. Verify NTFS ACLs separately.
- The CLI does not contact provider endpoints. Only open official provider consoles manually.

## Release hardening

Pin CI actions to immutable SHAs before a public stable release; add dependency review, code scanning, npm provenance and release branch protection. Perform manual provider smoke tests on disposable apps before v1.0. No real secrets in CI.
