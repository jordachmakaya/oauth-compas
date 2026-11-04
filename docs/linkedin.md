# Set up LinkedIn sign-in

This guide takes you from nothing to working LinkedIn OAuth credentials in your project. It takes about 15 minutes. You create the app yourself in LinkedIn's Developer Portal; OAuth Compass checks and stores the result.

## Before you start

**You need:**

| What | How to check |
| --- | --- |
| Node.js 22 or newer | Run `node -v`. If it fails or shows a lower number, install Node.js from [nodejs.org](https://nodejs.org). |
| A LinkedIn account | Sign in at [linkedin.com/developers](https://www.linkedin.com/developers/). |
| A LinkedIn company Page | LinkedIn asks you to add one when you create the app. Create it first if you have none. |
| A terminal open in your project's main folder | Run `pwd` (macOS, Linux, PowerShell). It should show your project folder. |

**You do not need:**

- Any LinkedIn command-line tool.
- Git, unless your project uses it. OAuth Compass simply writes to `.gitignore`.
- To install OAuth Compass. `npx` downloads it for you.

**Two addresses you will use.** The examples use a local app on port 3000. Replace them if yours differ.

| Name | What it means | Example |
| --- | --- | --- |
| Origin | The address of your app | `http://localhost:3000` |
| Redirect URL | Where LinkedIn sends users back after sign-in. Your auth library documents this path. | `http://localhost:3000/api/auth/callback/linkedin` |

LinkedIn's documentation describes redirect URLs over HTTPS. We have not confirmed that the portal accepts `http://localhost`. If it refuses, use an `https://` address for your app, and use that same address in every command below.

## Step 1: Get your checklist

```bash
npx oauth-compass guide linkedin --origin http://localhost:3000 --redirect http://localhost:3000/api/auth/callback/linkedin
```

You should see `LinkedIn OAuth setup`, followed by your two addresses and a numbered list.

## Step 2: Create the LinkedIn app

1. Open the [Developer Portal](https://www.linkedin.com/developers/apps) and click **My Apps**.
2. Create an app, complete its details, and add your company Page.
3. Open the **Products** tab and request **Sign in with LinkedIn using OpenID Connect**. It is self-service and needs no special approval.
4. Open the **Auth** tab and add your redirect URL. It must be a full address, without `#`. Any `?parameters` are ignored.
5. Check that the `openid`, `profile` and `email` scopes appear on the **Auth** tab.
6. On the same tab, copy the **Client ID** and **Client Secret**. Keep the secret private, like a password.

## Step 3: Save the credentials in a local file

Create a text file named `linkedin-oauth.json` in your **home folder**, not in your project, so it cannot be committed by accident. Paste this, then replace the first two values with yours:

```json
{"client_id":"PLACEHOLDER_ID","client_secret":"PLACEHOLDER_SECRET","redirect_uris":["http://localhost:3000/api/auth/callback/linkedin"]}
```

## Step 4: Import the credentials

```bash
npx oauth-compass import linkedin --file "$HOME/linkedin-oauth.json" --redirect http://localhost:3000/api/auth/callback/linkedin
```

You should see `Credentials stored locally:` followed by two file paths. Your secrets are now in the `.oauth-init/` folder, which was added to `.gitignore`.

This command works in PowerShell and in macOS and Linux terminals. In the older Windows Command Prompt, replace `$HOME` with `%USERPROFILE%`.

## Step 5: Check everything

```bash
npx oauth-compass doctor linkedin
```

You should see three lines starting with `PASS`. On Windows, `doctor` does not check file permissions.

## Step 6: Finish up

1. Delete `linkedin-oauth.json` from your home folder. You no longer need it.
2. Open `.oauth-init/linkedin.env` and copy the three values into your app's server settings.

```dotenv
LINKEDIN_CLIENT_ID="your client id"
LINKEDIN_CLIENT_SECRET="your client secret"
LINKEDIN_REDIRECT_URI="http://localhost:3000/api/auth/callback/linkedin"
```

Never put the secret in browser code or commit it. OAuth Compass does not add a sign-in button or handle the callback: your app or auth library does that.

## If something goes wrong

| Message | Meaning | Fix |
| --- | --- | --- |
| `Unable to read credentials JSON` | The file is missing, or its content is not valid JSON | Check the path and quotes. Save the file as plain UTF-8. |
| `Expected redirect URI is not present` | `--redirect` differs from the file, even by a final `/` | Make both exactly identical. |
| `Refusing to overwrite` | Credentials already exist | Delete the two `linkedin.*` files in `.oauth-init/` if you want to replace them, then import again. |
| `Non-local redirect URL must use HTTPS` | Only `localhost`, `127.0.0.1` and `[::1]` may use `http` | Use an `https://` address. |
| `Redirect_uri doesn't match` in the browser | Your app sent a different address from the Auth tab | Make the Auth tab, the `.env` value and your app identical. |
| `Invalid scope` in the browser | The app does not have that scope | Confirm the product on the **Products** tab, then check the **Auth** tab. |
| `FAIL` in `doctor` | That check failed | Read the line: it names the file or `.gitignore` problem. |

## Good to know

- `openid` turns on OpenID Connect, `profile` gives the member's name and picture, and `email` gives their email address.
- The `email` field is optional in LinkedIn's response, so your app must cope without it.
- LinkedIn states that this sign-in does not verify user identities, so do not present it that way.

## Sources

Checked on 2026-11-04:

- [Sign In with LinkedIn using OpenID Connect](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2)
- [Getting access to LinkedIn APIs](https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access)
- [LinkedIn 3-legged OAuth flow](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow)
- [Accessing LinkedIn APIs](https://www.linkedin.com/help/linkedin/answer/a526048)
