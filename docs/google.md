# Set up Google sign-in

This guide takes you from nothing to working Google OAuth credentials in your project. It takes about 15 minutes. You create the client yourself in Google's console; OAuth Compass checks and stores the result.

**In a hurry?** Run `npx @hardmachinelabs/oauth-compass` and answer the questions. This guide explains the same steps in detail.

## Before you start

**You need:**

| What | How to check |
| --- | --- |
| Node.js 22 or newer | Run `node -v`. If it fails or shows a lower number, install Node.js from [nodejs.org](https://nodejs.org). |
| A Google account | Sign in at [console.cloud.google.com](https://console.cloud.google.com). |
| A terminal open in your project's main folder | Run `pwd` (macOS, Linux, PowerShell). It should show your project folder. |

**You do not need:**

- The Google Cloud CLI (`gcloud`). Everything happens in the browser.
- Git, unless your project uses it. OAuth Compass simply writes to `.gitignore`.
- To install OAuth Compass. `npx` downloads it for you.

**Two addresses you will use.** The examples use a local app on port 3000. Replace them if yours differ.

| Name | What it means | Example |
| --- | --- | --- |
| Origin | The address of your app, with no path and no final `/` | `http://localhost:3000` |
| Redirect URL | Where Google sends users back after sign-in. Your auth library documents this path. | `http://localhost:3000/api/auth/callback/google` |

## Step 1: Get your checklist

```bash
npx @hardmachinelabs/oauth-compass guide google --origin http://localhost:3000 --redirect http://localhost:3000/api/auth/callback/google
```

You should see `Google OAuth setup`, followed by your two addresses and a numbered list.

## Step 2: Create the OAuth client

Read step 6 before you start: **Google shows the secret only once.**

1. Open the [Clients page](https://console.cloud.google.com/auth/clients).
2. Select a Google Cloud project, or create one when prompted.
3. If Google asks you to configure your app first, fill in the branding and audience information it requests.
4. Click **Create Client** and choose **Web application**.
5. Add your two addresses:
   - **Authorized JavaScript origins**: your origin.
   - **Authorized redirect URIs**: your redirect URL.
6. Click **Create**, then **download the JSON file immediately**. You cannot view or download the secret again.

Changes can take from 5 minutes to a few hours to take effect.

## Step 3: Rename the downloaded file

Google gives the file a long name. In your `Downloads` folder, rename it to `client_secret.json`. Leave it outside your project.

It looks like this, with your real values. Do not edit it:

```json
{"web":{"client_id":"PLACEHOLDER_ID","client_secret":"PLACEHOLDER_SECRET","redirect_uris":["http://localhost:3000/api/auth/callback/google"]}}
```

## Step 4: Import the credentials

```bash
npx @hardmachinelabs/oauth-compass import google --file "$HOME/Downloads/client_secret.json" --redirect http://localhost:3000/api/auth/callback/google
```

You should see `Credentials stored locally:` followed by two file paths. Your secrets are now in the `.oauth-init/` folder, which was added to `.gitignore`.

This command works in PowerShell and in macOS and Linux terminals. In the older Windows Command Prompt, replace `$HOME` with `%USERPROFILE%`.

## Step 5: Check everything

```bash
npx @hardmachinelabs/oauth-compass doctor google
```

You should see three lines starting with `PASS`. On Windows, a fourth `INFO` line reminds you that file permissions are not checked.

## Step 6: Finish up

1. Delete `client_secret.json` from your `Downloads` folder.
2. Open `.oauth-init/google.env` and copy the three values into your app's server settings.

```dotenv
GOOGLE_CLIENT_ID="your client id"
GOOGLE_CLIENT_SECRET="your client secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/callback/google"
```

Never put the secret in browser code or commit it. OAuth Compass does not add a sign-in button or handle the callback: your app or auth library does that.

## If something goes wrong

| Message | Meaning | Fix |
| --- | --- | --- |
| `Unable to read credentials JSON` | The file is missing, or was renamed differently | Check the file name and folder. |
| `Expected Google OAuth Web client JSON` | The file is not a Web application client | Create a client of type **Web application**. |
| `redirect_uris must contain 1-20 redirect URLs` | The JSON has no redirect URI | Create the client with a redirect URI, then download the JSON. |
| `Expected redirect URI is not present` | `--redirect` differs from the file, even by a final `/` | Make both exactly identical. |
| `Google does not allow raw IP addresses` | The redirect URL uses an IP address | Use a domain name, or `localhost` for local work. |
| `Refusing to overwrite` | Credentials already exist | Delete the two `google.*` files in `.oauth-init/` if you want to replace them, then import again. |
| `redirect_uri_mismatch` in the browser | Your app sent a different address from the console | Match scheme, case and final `/` exactly, then allow time for the change. |
| `FAIL` in `doctor` | That check failed. `out of sync` means the `.env` no longer matches the JSON file. | Read the line: it names the file or `.gitignore` problem. |

If you lost the secret, you need a new one from the client's page in the console.

## Good to know

- Google does not allow a raw IP address, a fragment (`#`), a wildcard (`*`) or `/..` in redirect URIs. `localhost` addresses may use `http`; everything else needs `https`.
- The suggested scopes are `openid`, `email` and `profile`.
- A public app using certain scopes may need Google's verification.

## Sources

Checked on 2026-11-04:

- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Manage OAuth clients](https://support.google.com/cloud/answer/15549257)
