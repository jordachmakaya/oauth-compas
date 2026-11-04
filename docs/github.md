# Set up GitHub sign-in

This guide takes you from nothing to working GitHub OAuth credentials in your project. It takes about 10 minutes. You create the app yourself on github.com; OAuth Compass checks and stores the result.

**In a hurry?** Run `npx @hardmachinelabs/oauth-compass` and answer the questions. This guide explains the same steps in detail.

## Before you start

**You need:**

| What | How to check |
| --- | --- |
| Node.js 22 or newer | Run `node -v`. If it fails or shows a lower number, install Node.js from [nodejs.org](https://nodejs.org). |
| A GitHub account | Sign in at [github.com](https://github.com). |
| A terminal open in your project's main folder | Run `pwd` (macOS, Linux, PowerShell). It should show your project folder. |

**You do not need:**

- The GitHub CLI (`gh`). OAuth Compass does not use it, and `gh` has no command that creates an OAuth App.
- Git, unless your project uses it. OAuth Compass simply writes to `.gitignore`.
- To install OAuth Compass. `npx` downloads it for you.

**Two addresses you will use.** The examples use a local app on port 3000. Replace them if yours differ.

| Name | What it means | Example |
| --- | --- | --- |
| Origin | The address of your app | `http://localhost:3000` |
| Redirect URL | Where GitHub sends users back after sign-in. Your auth library documents this path. | `http://localhost:3000/api/auth/callback/github` |

## Step 1: Get your checklist

```bash
npx @hardmachinelabs/oauth-compass guide github --origin http://localhost:3000 --redirect http://localhost:3000/api/auth/callback/github
```

You should see `GitHub OAuth setup`, followed by your two addresses and a numbered list.

## Step 2: Create the OAuth App on GitHub

1. On GitHub, click your profile picture (top right), then **Settings**.
2. In the left sidebar, click **Developer settings**, then **OAuth apps**.
3. Click **New OAuth App**. On a first app, the button says **Register a new application**.
4. Fill in the form:
   - **Application name**: any name your users will recognise.
   - **Homepage URL**: your origin, `http://localhost:3000`.
   - **Authorization callback URL**: your redirect URL.
5. Leave the other options as they are, then click **Register application**.
6. On the app's page, copy the **Client ID**.
7. Generate a client secret and copy it right away. Treat it as a password, and assume you cannot view it again.

## Step 3: Save the credentials in a local file

Create a text file named `github-oauth.json` in your **home folder**, not in your project, so it cannot be committed by accident. Paste this, then replace the first two values with yours:

```json
{"client_id":"PLACEHOLDER_ID","client_secret":"PLACEHOLDER_SECRET","redirect_uris":["http://localhost:3000/api/auth/callback/github"]}
```

## Step 4: Import the credentials

```bash
npx @hardmachinelabs/oauth-compass import github --file "$HOME/github-oauth.json" --redirect http://localhost:3000/api/auth/callback/github
```

You should see `Credentials stored locally:` followed by two file paths. Your secrets are now in the `.oauth-init/` folder, which was added to `.gitignore`.

This command works in PowerShell and in macOS and Linux terminals. In the older Windows Command Prompt, replace `$HOME` with `%USERPROFILE%`.

## Step 5: Check everything

```bash
npx @hardmachinelabs/oauth-compass doctor github
```

You should see three lines starting with `PASS`. On Windows, a fourth `INFO` line reminds you that file permissions are not checked.

## Step 6: Finish up

1. Delete `github-oauth.json` from your home folder. You no longer need it.
2. Open `.oauth-init/github.env` and copy the three values into your app's server settings.

```dotenv
GITHUB_CLIENT_ID="your client id"
GITHUB_CLIENT_SECRET="your client secret"
GITHUB_REDIRECT_URI="http://localhost:3000/api/auth/callback/github"
```

Never put the secret in browser code or commit it. OAuth Compass does not add a sign-in button or handle the callback: your app or auth library does that.

## If something goes wrong

| Message | Meaning | Fix |
| --- | --- | --- |
| `Unable to read credentials JSON` | The file is missing, or its content is not valid JSON | Check the path and quotes. Save the file as plain UTF-8. |
| `Expected redirect URI is not present` | `--redirect` differs from the file, even by a final `/` | Make both exactly identical. |
| `Refusing to overwrite` | Credentials already exist | Delete the two `github.*` files in `.oauth-init/` if you want to replace them, then import again. |
| `Non-local redirect URL must use HTTPS` | Only `localhost`, `127.0.0.1` and `[::1]` may use `http` | Use an `https://` address. |
| `redirect_uri_mismatch` in the browser, or the sign-in fails on return | The app's callback differs from the one your app sends | Make the GitHub setting, the `.env` value and your app identical. |
| `FAIL` in `doctor` | That check failed. `out of sync` means the `.env` no longer matches the JSON file. | Read the line: it names the file or `.gitignore` problem. |

If your secret leaks, generate a new one on GitHub, update your app, then delete the old one.

## Good to know

- An OAuth App can have up to 10 callback URLs.
- GitHub advises `127.0.0.1` rather than `localhost` for loopback addresses. Both are accepted by OAuth Compass.
- The suggested scopes are `read:user` (read profile data) and `user:email` (read email addresses). Request only what your app needs.
- GitHub Apps can suit repository integrations better than OAuth Apps. This guide covers OAuth Apps only.

## Sources

Checked on 2026-11-04:

- [Creating an OAuth app](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)
- [Authorizing OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [Best practices for OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/best-practices-for-creating-an-oauth-app)
- [Scopes for OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)
- [gh auth login](https://cli.github.com/manual/gh_auth_login)
