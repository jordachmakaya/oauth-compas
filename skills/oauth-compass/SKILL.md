---
name: oauth-compass
description: Guides a user through setting up Google, GitHub, LinkedIn or Amazon Cognito OAuth credentials locally with the oauth-compass CLI, without handling their secrets. Use when the user wants to add Google, GitHub, LinkedIn or AWS Cognito sign-in, create an OAuth client or OAuth App, or get a client ID, client secret or redirect URL into a project.
license: MIT
---

# OAuth Compass

Use the `oauth-compass` CLI to help a user set up OAuth credentials for Google, GitHub, LinkedIn or Amazon Cognito. The user creates the app and handles the secret. You run the local commands and explain each step.

## Rules

1. **Never ask for a secret.** If the user pastes a client secret in the chat, tell them to generate a new one, because it is now exposed.
2. **Never read secret files.** Do not open, print or summarize `.oauth-init/*`, `client_secret.json` or the user's credentials file. Use `doctor` to check them.
3. **Never put a secret in a command.** The CLI has no option for it.
4. **Never automate a provider console.** Do not use browser automation or sign in for the user. Creating the app is a manual step that the user performs.
5. **Never promise that credentials can be created automatically.** No such feature exists.
6. **Never force an overwrite.** If the CLI refuses to overwrite, ask the user before deleting anything.
7. **Do not run the interactive command.** `npx oauth-compass` and `init` are for people in a terminal. Use the commands below.

## What the user needs

Node.js 22 or newer, and an account with the provider. LinkedIn also requires a company Page. `gh`, `gcloud`, `aws` and other provider tools are not needed.

## Workflow

Replace `<provider>` with `google`, `github`, `linkedin` or `cognito`. Ask for the app's URL and callback URL if you cannot find them in the project. The examples use a local app on port 3000.

**1. Show the checklist.** Run this, then present the steps to the user:

```bash
npx oauth-compass guide <provider> --origin http://localhost:3000 --redirect http://localhost:3000/api/auth/callback/<provider>
```

**2. Hand over to the user.** Ask them to complete the console steps and tell you when they have a credentials file. Wait for them.

- Google: they download the JSON right after creating a Web application client. Google shows the secret only once.
- GitHub, LinkedIn and Cognito: they create a local file outside the project, in this format, which they fill in themselves. Cognito needs an app client of type Traditional web application, and one more field: `"issuer":"https://cognito-idp.<region>.amazonaws.com/<user pool id>"`.

```json
{"client_id":"...","client_secret":"...","redirect_uris":["http://localhost:3000/api/auth/callback/github"]}
```

**3. Import.** Ask only for the file path, then run this from the project root:

```bash
npx oauth-compass import <provider> --file "<path>" --redirect <redirect-url>
```

**4. Verify.**

```bash
npx oauth-compass doctor <provider>
```

Every line must start with `PASS`. This checks local files only. It does not prove that the provider accepts the credentials.

**5. Finish.** Tell the user to delete their input file, and to copy the values from `.oauth-init/<provider>.env` to their server configuration themselves. If you write code that reads them, use the variable names only: `<PROVIDER>_CLIENT_ID`, `<PROVIDER>_CLIENT_SECRET` and `<PROVIDER>_REDIRECT_URI`, in capitals, plus `COGNITO_ISSUER` for Cognito. These values belong on the server only, never in browser code.

## Errors

| Message | What to do |
| --- | --- |
| `Unable to read credentials JSON` | Ask the user to check the path and that the file is valid JSON. Do not open the file yourself. |
| `Expected redirect URI is not present` | `--redirect` must match the file exactly, including any final `/`. |
| `Refusing to overwrite` | Credentials already exist. Ask the user before removing them. |
| `Non-local redirect URL must use HTTPS` | Only `localhost`, `127.0.0.1` and `[::1]` may use `http`. |
| `Expected Google OAuth Web client JSON` | The client must be of type **Web application**. |
| `issuer must look like` | Ask the user to rebuild the issuer from the Region and user pool ID. |
| `Unknown option` | Check the command against this page. |

## Limits

The CLI does not create apps, contact providers, exchange tokens or add sign-in code. The user's app or auth library handles sign-in.

Beginner guides: [Google](https://github.com/jordachmakaya/oauth-compass/blob/main/docs/google.md), [GitHub](https://github.com/jordachmakaya/oauth-compass/blob/main/docs/github.md), [LinkedIn](https://github.com/jordachmakaya/oauth-compass/blob/main/docs/linkedin.md), [Amazon Cognito](https://github.com/jordachmakaya/oauth-compass/blob/main/docs/cognito.md).
