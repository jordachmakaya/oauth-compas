# Set up Amazon Cognito sign-in

This guide takes you from nothing to working Amazon Cognito credentials in your project. It takes about 15 minutes. You create the user pool yourself in the AWS console; OAuth Compass checks and stores the result.

**What Cognito is:** AWS has no "Sign in with AWS" button for your users. Cognito is a user directory that you own: your users create accounts in your user pool and sign in through its hosted pages, over standard OAuth 2.0 and OpenID Connect.

**In a hurry?** Run `npx oauth-compass` and answer the questions. This guide explains the same steps in detail.

## Before you start

**You need:**

| What | How to check |
| --- | --- |
| Node.js 22 or newer | Run `node -v`. If it fails or shows a lower number, install Node.js from [nodejs.org](https://nodejs.org). |
| An AWS account allowed to manage Cognito | Sign in at the [Amazon Cognito console](https://console.aws.amazon.com/cognito/v2/idp/user-pools). AWS's `AmazonCognitoPowerUser` policy is enough. |
| A terminal open in your project's main folder | Run `pwd` (macOS, Linux, PowerShell). It should show your project folder. |

**You do not need:**

- The AWS CLI, an AWS access key or CDK. Everything happens in the browser.
- Git, unless your project uses it. OAuth Compass simply writes to `.gitignore`.
- To install OAuth Compass. `npx` downloads it for you.

**Two addresses you will use.** The examples use a local app on port 3000. Replace them if yours differ.

| Name | What it means | Example |
| --- | --- | --- |
| Origin | The address of your app | `http://localhost:3000` |
| Redirect URL | Where Cognito sends users back after sign-in. Your auth library documents this path. | `http://localhost:3000/api/auth/callback/cognito` |

Cognito allows `http` only for `localhost`, so `http://127.0.0.1` is refused. Everything else needs `https`.

## Step 1: Get your checklist

```bash
npx oauth-compass guide cognito --origin http://localhost:3000 --redirect http://localhost:3000/api/auth/callback/cognito
```

You should see `Amazon Cognito OAuth setup`, followed by your two addresses and a numbered list.

## Step 2: Create the user pool

Some of these choices cannot be changed later.

1. Open the [Amazon Cognito console](https://console.aws.amazon.com/cognito/v2/idp/user-pools) and click **Create user pool**.
2. Under **Application type**, choose **Traditional web application**. This is the type that creates a client secret, and a secret cannot be added to an app client later.
3. Name your application.
4. Choose how users identify themselves, such as email, and which details they must give at sign-up.
5. Under **Add a return URL**, enter your redirect URL.
6. Click **Create your application**.

## Step 3: Save the credentials in a local file

Find these four values in the console:

| Value | Where to find it |
| --- | --- |
| Client ID and client secret | In your user pool, open **App clients**, then your app. |
| User pool ID, such as `us-east-1_EXAMPLE` | On the user pool's overview page. |
| Region, such as `us-east-1` | The first part of the user pool ID. |

Create a text file named `cognito-oauth.json` in your **home folder**, not in your project, so it cannot be committed by accident. Paste this, then replace the placeholder values with yours. The `issuer` is `https://cognito-idp.<region>.amazonaws.com/<user pool ID>`.

```json
{"client_id":"PLACEHOLDER_ID","client_secret":"PLACEHOLDER_SECRET","issuer":"https://cognito-idp.us-east-1.amazonaws.com/us-east-1_EXAMPLE","redirect_uris":["http://localhost:3000/api/auth/callback/cognito"]}
```

## Step 4: Import the credentials

```bash
npx oauth-compass import cognito --file "$HOME/cognito-oauth.json" --redirect http://localhost:3000/api/auth/callback/cognito
```

You should see `Credentials stored locally:` followed by two file paths. Your secrets are now in the `.oauth-init/` folder, which was added to `.gitignore`.

This command works in PowerShell and in macOS and Linux terminals. In the older Windows Command Prompt, replace `$HOME` with `%USERPROFILE%`.

## Step 5: Check everything

```bash
npx oauth-compass doctor cognito
```

You should see three lines starting with `PASS`. On Windows, a fourth `INFO` line reminds you that file permissions are not checked.

## Step 6: Finish up

1. Delete `cognito-oauth.json` from your home folder. You no longer need it.
2. Open `.oauth-init/cognito.env` and copy the four values into your app's server settings.

```dotenv
COGNITO_CLIENT_ID="your client id"
COGNITO_CLIENT_SECRET="your client secret"
COGNITO_REDIRECT_URI="http://localhost:3000/api/auth/callback/cognito"
COGNITO_ISSUER="https://cognito-idp.us-east-1.amazonaws.com/us-east-1_EXAMPLE"
```

Never put the secret in browser code or commit it. OAuth Compass does not add a sign-in button or handle the callback: your app or auth library does that. Libraries that support OIDC discovery usually need only the issuer, client ID and client secret.

## If something goes wrong

| Message | Meaning | Fix |
| --- | --- | --- |
| `Unable to read credentials JSON` | The file is missing, or its content is not valid JSON | Check the path and quotes. Save the file as plain UTF-8. |
| `issuer must look like` | The `issuer` value is missing or has the wrong format | Rebuild it from your Region and user pool ID. |
| `client_secret must be a non-empty string` | Your app client has no secret | Create a new app client of type **Traditional web application**. |
| `Expected redirect URI is not present` | `--redirect` differs from the file, even by a final `/` | Make both exactly identical. |
| `Amazon Cognito allows HTTP only` | You used `http` with an address other than `localhost` | Use `http://localhost` or an `https://` address. |
| `Refusing to overwrite` | Credentials already exist | Delete the two `cognito.*` files in `.oauth-init/` if you want to replace them, then import again. |
| `FAIL` in `doctor` | That check failed | Read the line: it names the file or `.gitignore` problem. |

## Good to know

- The suggested scopes are `openid`, `email` and `profile`. Cognito returns an ID token only when `openid` is requested.
- Sign-in through hosted pages needs a domain on the user pool.
- The console's quick setup is open to public self sign-up, and AWS recommends it for testing. Review the settings before production, and check [Cognito pricing](https://aws.amazon.com/cognito/pricing).

## Sources

Checked on 2026-11-04:

- [Create a new application in the Amazon Cognito console](https://docs.aws.amazon.com/cognito/latest/developerguide/getting-started-user-pools.html)
- [Application-specific settings with app clients](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-client-apps.html)
- [Identity provider and relying party endpoints](https://docs.aws.amazon.com/cognito/latest/developerguide/federation-endpoints.html)
