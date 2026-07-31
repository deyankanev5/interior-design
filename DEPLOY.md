# Putting Palette Studio online

This guide gets the app onto the internet, at a real web address you can open on
any device and send to anyone.

**It's free.** Microsoft's "Static Web Apps" service has a free plan that costs
nothing per month, and if the site ever got more traffic than the free plan
allows, it stops serving rather than charging you. There is no way to get a
surprise bill.

There are two ways to do this. **Way 1 is mostly clicking.** Way 2 needs you to
type a few commands. Pick whichever sounds less unpleasant.

---

# Way 1 — Point and click (recommended)

## What you need first

An Azure account. If you don't have one, go to
[azure.microsoft.com/free](https://azure.microsoft.com/free) and sign up. A card
is required for identity checks, but the free plan we're using doesn't charge.

## One thing to sort out first

Azure will publish the site by using a GitHub feature called **Actions**.
Right now Actions isn't working on your repository — every attempt stops
immediately because GitHub isn't giving it a machine to run on. That's a
GitHub account setting, not a problem with the app.

Two ways to fix it, either is fine:

**Option A — make the repository public** (free and unlimited)

1. Go to <https://github.com/deyankanev5/interior-design/settings>
2. Scroll to the very bottom, to the red **Danger Zone** box
3. Click **Change visibility** → **Make public** → confirm

Anyone could then read the code. There are no passwords or client data in it.

**Option B — check your GitHub billing**

1. Go to <https://github.com/settings/billing>
2. Look for **Actions** minutes. If you're out, or there's a spending limit of
   £0, that's the cause.

If neither appeals, skip to **Way 2** below — it doesn't use GitHub at all.

## Now create the site

1. Go to <https://portal.azure.com> and sign in.

2. In the search bar at the top, type **Static Web Apps** and click it in the
   results.

3. Click the **+ Create** button (top left).

4. Fill in the first page:

   | Field | What to put |
   | --- | --- |
   | Subscription | Leave as is |
   | Resource group | Click **Create new**, name it `palette-studio` |
   | Name | `palette-studio` (this becomes part of your web address) |
   | Plan type | **Free** ← important |
   | Region | **West Europe** |
   | Source | **GitHub** |

5. Click **Sign in with GitHub** and allow access when asked.

6. Three dropdowns appear. Choose:

   - Organization: **deyankanev5**
   - Repository: **interior-design**
   - Branch: **main**

7. A **Build Details** section appears. This tells Azure how to assemble the
   app. Set:

   | Field | What to put |
   | --- | --- |
   | Build Presets | **React** |
   | App location | `/` |
   | Api location | `api` |
   | Output location | `dist` |

   Those three values matter — if they're wrong the site won't build.

8. Click **Review + create**, then **Create**.

9. Wait about a minute, then click **Go to resource**.

10. Your web address is shown on that page as **URL**, something like
    `https://palette-studio-xxxx.azurestaticapps.net`. Click it.

The first build takes 2–3 minutes. If the page isn't there yet, wait a moment
and refresh.

That's it. From then on, every change pushed to the `main` branch updates the
live site automatically.

---

# Way 2 — Type a few commands

Use this if you'd rather not touch GitHub settings. It works today, exactly as
things stand.

## What you need

1. An Azure account (see above).
2. **Azure CLI** — a small program that lets your computer talk to Azure.
   Download: <https://learn.microsoft.com/cli/azure/install-azure-cli>
3. **Node.js**, version 20 or newer: <https://nodejs.org>

Then open a terminal:

- **Windows**: press Start, type `Terminal`, open it
- **Mac**: press ⌘ + Space, type `Terminal`, open it

Go to the project folder — type `cd `, then drag the project folder onto the
terminal window, then press Enter.

## The commands

Copy and paste these one at a time, pressing Enter after each and waiting for it
to finish.

**1. Sign in to Azure.** A browser window opens; sign in there.

```bash
az login
```

**2. Create the site.** Takes about a minute.

```bash
./infra/deploy.sh palette-studio
```

When it finishes it prints a long string of letters and numbers called a
**deployment token**. Copy it — it's the password that lets your computer
publish to the site. Keep it private.

**3. Install and check.** Confirms everything is in order before uploading.

```bash
npm ci
npm run deploy:check
```

You want to see `Ready to deploy.` at the end. If you see `FAIL` on any line,
stop and send me what it says.

**4. Publish.** Replace `PASTE_TOKEN_HERE` with the token from step 2, keeping
the quote marks.

```bash
export SWA_CLI_DEPLOYMENT_TOKEN='PASTE_TOKEN_HERE'
npm run deploy
```

On **Windows PowerShell**, step 4's first line is instead:

```powershell
$env:SWA_CLI_DEPLOYMENT_TOKEN='PASTE_TOKEN_HERE'
```

When it finishes it prints your web address. Open it in a browser.

## Publishing again later

Only steps 3 and 4 — creating the site is a one-time thing.

---

# Checking it worked

Open the address in a browser. You should see the palette, full-height colour
columns. Press the **spacebar** — the colours should change.

Then check a couple of things that commonly break in a first deployment:

1. Press spacebar a few times, then **copy the address from the address bar**,
   open a new tab and paste it. The same scheme should reappear. (This proves
   the sharing links work.)
2. Open the **Brief** panel from the toolbar. It should say Azure AI is not
   configured. **That message is correct and expected** — see below.

If the page is blank, or you get "404 Not Found", tell me and I'll look at it.

---

# About the "Brief" panel message

The app has two small optional features that use AI: turning a written
description into settings, and drafting a paragraph for a client. They need a
paid Azure AI service.

**You don't need them.** Everything that actually makes colour schemes —
generating, scoring, suggestions, the material catalogue, exports — works
without any AI at all and costs nothing. If you skip it, those two buttons just
say they're switched off. Nothing else changes.

If you ever do want them, tell me and I'll walk you through it separately.

---

# What this costs

**Nothing**, on the Free plan, for realistic use.

The free plan includes 100 GB of traffic per month. Each first-time visitor
downloads about 107 KB, and returning visitors download almost nothing because
their browser remembers the app. That's roughly **900,000 first-time visits a
month** before you'd hit the limit.

The app also does nearly all its work inside the visitor's own browser rather
than on a server, so there's no ongoing running cost.

The one thing that would cost money is the optional AI, which is charged per
use. Don't set it up and it costs nothing.

---

# Using your own web address

If you want `palette.yourcompany.com` instead of the long Azure address:

1. In the Azure portal, open your Static Web App
2. Click **Custom domains** in the left menu
3. Click **+ Add** and follow the instructions

You'll need to add a record with whoever you bought the domain from. The
security certificate (the padlock in the browser) is set up automatically and
included free.

---

# If something goes wrong

**The site says 404 or shows nothing** — the build settings are probably wrong.
Check that App location is `/`, Api location is `api`, and Output location is
`dist`.

**"deployment_token provided was invalid"** — the token was copied wrong, or has
extra spaces. Get a fresh one:

```bash
az staticwebapp secrets list --name palette-studio --query "properties.apiKey" -o tsv
```

**The GitHub build fails instantly with no explanation** — that's the GitHub
Actions problem described near the top. Go back and do Option A or B, or use
Way 2 instead.

**Anything else** — send me the exact message you saw and I'll sort it out.

---

<details>
<summary><strong>Technical reference</strong> — click to expand</summary>

## Architecture

Static SPA on the CDN plus two managed Azure Functions (`/api/pinterest`,
`/api/ai`). Build config: `app_location: /`, `api_location: api`,
`output_location: dist`.

`api/` is a self-contained Azure Functions app (Node v4 programming model)
wrapping the runtime-agnostic handlers in `server/`. esbuild bundles them, so
shared code is inlined and there's no cross-package build ordering.

## Commands

```bash
npm run build          # SPA -> dist/
npm run build:api      # Functions -> api/dist/functions/
npm run verify:api     # exercise handlers without the Functions host
npm run deploy:check   # offline pre-flight; exits non-zero on a bad build
npm run deploy         # build + publish to production
npm run deploy:preview # build + publish to a preview environment
```

`deploy:check` validates the bundle exists and is referenced by `index.html`,
that the SPA fallback doesn't swallow `/api/*`, that `api/package.json` points
at the built handlers, that `@azure/functions` is a runtime dependency, and that
every deploy script's `--api-version` matches `platform.apiRuntime` in
`staticwebapp.config.json`. That last one is the mismatch that yields Functions
which fail to start after an otherwise-successful deploy.

To exercise the real upload path without publishing:

```bash
SWA_CLI_DEPLOYMENT_TOKEN='<token>' npm run deploy -- --dry-run
```

## Infrastructure as code

`infra/main.bicep` defaults to `sku = 'Free'`. Provision manually with:

```bash
az group create --name palette-studio --location westeurope
az deployment group create --resource-group palette-studio \
  --template-file infra/main.bicep --parameters name=palette-studio
az staticwebapp secrets list --name palette-studio \
  --query "properties.apiKey" -o tsv
```

## CI

`.github/workflows/azure-static-web-apps.yml` typechecks, lints, builds and
verifies the Functions, then deploys when
`AZURE_STATIC_WEB_APPS_API_TOKEN` is present. Without the secret the deploy step
skips with a notice rather than failing. PRs get preview environments, torn down
on close.

Note: the SWA CLI reads this file for build configuration and expects the job id
`build_and_deploy_job`. Renaming that job makes every local deploy print a
spurious "missing property" error.

If you create the app through the Azure portal with GitHub as the source, Azure
commits its own workflow alongside this one. Both will run; this one will skip
its deploy step because the token secret Azure creates has a different name.
Harmless, but you may prefer to delete one.

## AI configuration

```bash
az staticwebapp appsettings set --name palette-studio \
  --setting-names AZURE_AI_ENDPOINT=https://<resource>.openai.azure.com \
                  AZURE_AI_DEPLOYMENT=<deployment-name> \
                  AZURE_AI_API_KEY=<key>
```

Application settings, not repository secrets — the key reaches neither source
control nor the browser. `GET /api/ai` is a capability probe returning
`{"available": false}` until configured, which is what lets the Brief panel
disable itself cleanly.

## Verifying a deployment from the command line

```bash
URL=$(az staticwebapp show --name palette-studio --query defaultHostname -o tsv)
curl -s -o /dev/null -w '%{http_code}\n' "https://$URL/"   # 200
curl -s "https://$URL/api/ai"                              # {"available":false}
curl -s "https://$URL/api/pinterest" | head -c 120          # 400 + guidance
```

## Removing the API entirely

Delete `api/` and drop `api_location`. You lose Pinterest *pin-URL* import only;
drag-drop, clipboard paste and direct image URLs continue to work.

</details>
