# Credential input formats

For step-by-step instructions, see the [Google](google.md), [GitHub](github.md), [LinkedIn](linkedin.md) and [Amazon Cognito](cognito.md) guides.

Secrets must be obtained from each provider's official developer console. Input files are limited to 1 MiB. No browser automation, scraping, or third-party API impersonation.

## Google (downloaded file)

The CLI accepts the provider's **Web application** OAuth JSON as downloaded (the rest of Google's fields may be present). Example **placeholder**:

```json
{"web":{"client_id":"PLACEHOLDER_ID","client_secret":"PLACEHOLDER_SECRET","redirect_uris":["http://localhost:3000/api/auth/callback/google"]}}
```

## GitHub OAuth App / LinkedIn OIDC

These consoles display credentials rather than supplying the same Google JSON format. Create a local input file (do not commit it):

```json
{"client_id":"PLACEHOLDER_ID","client_secret":"PLACEHOLDER_SECRET","redirect_uris":["http://localhost:3000/api/auth/callback/github"]}
```

Use a LinkedIn callback path instead for LinkedIn. This input is never transmitted by the CLI.

## Amazon Cognito

Same file, plus the user pool's `issuer`:

```json
{"client_id":"PLACEHOLDER_ID","client_secret":"PLACEHOLDER_SECRET","issuer":"https://cognito-idp.us-east-1.amazonaws.com/us-east-1_EXAMPLE","redirect_uris":["http://localhost:3000/api/auth/callback/cognito"]}
```

The issuer is also written to the outputs, as `COGNITO_ISSUER` in the `.env`.

## Outputs

Outputs in `.oauth-init/`:

- `<provider>.credentials.json` — normalized provider-specific JSON **containing the secret**.
- `<provider>.env` — app-friendly env variables **containing the secret**. Values are double-quoted, or single-quoted if they contain `$`, a backtick, a backslash or `"`, so that sourcing the file cannot expand them. A value that cannot be quoted safely is refused.

Redirect URIs are stored exactly as written, because providers compare them exactly. The `.env` uses the URI passed to `--redirect`, or the first URI in the file.

Neither output is safe for public repositories or client-side bundles. Env interpolation is not performed. The CLI does not issue OAuth tokens or configure your app's auth library.
