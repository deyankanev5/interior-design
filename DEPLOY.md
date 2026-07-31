# Deploying to Azure Static Web Apps

Palette Studio is a static SPA plus two small HTTP Functions, which is exactly
the shape Static Web Apps is built for. On the **Free** tier this costs **£0 /
€0 / $0 per month** and cannot generate a surprise bill — the Free tier stops
serving past its quota rather than billing overage.

Two routes below. **Route A is the one to use** if your GitHub Actions minutes
are unavailable or you just want the site live in five minutes.

---

## Before you start

You need:

- An Azure subscription
- The [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli)
- Node 20 or newer

```bash
az login
az account show --query name -o tsv     # confirm the right subscription
```

If you have several subscriptions:

```bash
az account set --subscription "<subscription name or id>"
```

---

## Route A — deploy from your machine (no CI required)

### 1. Create the Static Web App

```bash
./infra/deploy.sh palette-studio
```

This creates a resource group and a Free-tier Static Web App from
`infra/main.bicep`, then prints the **deployment token**. Keep that token — it
is the only credential the deploy needs.

To choose a different region or name:

```bash
LOCATION=northeurope SKU=Free ./infra/deploy.sh my-app-name
```

<details>
<summary>Prefer to do it by hand, without the script</summary>

```bash
az group create --name palette-studio --location westeurope

az deployment group create \
  --resource-group palette-studio \
  --template-file infra/main.bicep \
  --parameters name=palette-studio

az staticwebapp secrets list \
  --name palette-studio \
  --resource-group palette-studio \
  --query "properties.apiKey" -o tsv
```

</details>

### 2. Check the build before uploading anything

```bash
npm ci
npm run deploy:check
```

This builds the SPA, bundles the Functions and runs the deployment in **dry-run**
mode. A healthy run ends with:

```
Deploying front-end files from folder:  .../dist
Deploying API from folder:              .../api
Deploying to environment: production
Found configuration file:               .../staticwebapp.config.json
```

### 3. Deploy

```bash
export SWA_CLI_DEPLOYMENT_TOKEN='<the token from step 1>'
npm run deploy
```

The CLI prints the live URL when it finishes. It is also available any time
from:

```bash
az staticwebapp show --name palette-studio --query defaultHostname -o tsv
```

Use `npm run deploy:preview` to push to a named preview environment instead of
production.

> On Windows PowerShell, set the token with
> `$env:SWA_CLI_DEPLOYMENT_TOKEN='<token>'`.

---

## Route B — deploy from GitHub Actions

Only worthwhile if Actions runs on your account. (On a private repository with
no included minutes left, jobs are never assigned a runner and fail in seconds
with empty logs — that is a billing condition, not a workflow fault.)

1. Provision the app as in Route A step 1 to get the deployment token.
2. Store it as a repository secret:

   ```bash
   gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --body '<token>'
   ```

   Or: **Settings → Secrets and variables → Actions → New repository secret**.
3. Push to `main`.

`.github/workflows/azure-static-web-apps.yml` then typechecks, lints, builds,
verifies the Functions bundles and deploys. Pull requests get their own preview
URL, torn down automatically when the PR closes.

Until that secret exists the deploy step **skips with a notice** rather than
failing, so the build checks stay meaningful on their own.

---

## Verifying the deployment

```bash
URL=$(az staticwebapp show --name palette-studio --query defaultHostname -o tsv)

curl -s -o /dev/null -w '%{http_code}\n' "https://$URL/"            # 200
curl -s "https://$URL/api/ai"                                        # {"available":false}
curl -s "https://$URL/api/pinterest" | head -c 120                   # 400 + guidance
```

`GET /api/ai` returning `{"available": false}` is **correct** on a deployment
without AI credentials — it is a capability probe, and the Brief panel uses it
to disable itself cleanly.

In the browser, check that a deep link works (`https://$URL/#p=...`), since that
exercises the SPA fallback in `staticwebapp.config.json`.

---

## Optional: the AI features

The Brief and client-rationale features need an Azure AI Foundry deployment.
**Everything else works without them** — skip this section entirely and the two
features simply report themselves inactive.

Set the credentials as **application settings**, never in the repository:

```bash
az staticwebapp appsettings set --name palette-studio \
  --setting-names AZURE_AI_ENDPOINT=https://<resource>.openai.azure.com \
                  AZURE_AI_DEPLOYMENT=<deployment-name> \
                  AZURE_AI_API_KEY=<key>
```

They take effect within a minute; no redeploy needed. Confirm with:

```bash
curl -s "https://$URL/api/ai"     # now {"available":true}
```

Azure AI is billed per token, so it is the only part of this stack that costs
anything on use.

---

## Costs

| | Free | Standard |
| --- | --- | --- |
| Monthly | **$0** | ~$9 per app |
| Bandwidth | 100 GB, then the site stops serving | 100 GB, then $0.20/GB |
| Managed Functions | included | included |
| Custom domain + TLS | yes | yes, with SLA |

The deployed payload is **~107 KB gzipped** per first-time visit, and repeat
visits transfer almost nothing because `/assets/*` is served immutable. 100 GB
is therefore roughly 900,000 first-time visits per month.

Compute is near-zero by design: generation, scoring, the catalogue, suggestions
and exports all run in the browser. The Functions only wake for a Pinterest
*pin-URL* import — drag-drop and clipboard paste never touch the server.

`infra/main.bicep` defaults to `sku = 'Free'`. Pass `SKU=Standard` only if you
need the custom-domain SLA or more staging environments.

---

## Custom domain

```bash
az staticwebapp hostname set \
  --name palette-studio \
  --hostname palette.example.com
```

Then add the CNAME the command reports at your DNS provider. Certificates are
issued and renewed automatically, on the Free tier too.

---

## Troubleshooting

**`deployment_token provided was invalid`** — the token is wrong, expired, or
belongs to a different Static Web App. Re-read it with
`az staticwebapp secrets list --name <name> --query "properties.apiKey" -o tsv`.

**`missing property "jobs.build_and_deploy_job"`** — the CLI reads the workflow
file for build configuration and expects that conventional job id. This repo
already uses it; the error means the workflow was renamed.

**API routes return 404 after deploying** — `api/dist` was not built. `npm run
deploy` handles this, but a hand-rolled `swa deploy` needs `npm run build:api`
first.

**Functions fail to start** — check the runtime matches:
`staticwebapp.config.json` declares `node:20` and the deploy scripts pass
`--api-version 20`. Changing one means changing the other.

**Everything is slow on the first API call** — consumption Functions cold-start
in a second or two after idle. That only affects Pinterest pin import, which is
a deliberate user action, so it has never been worth paying to keep warm.

---

## Removing the API entirely

If you want zero server surface, delete `api/` and drop `api_location` from the
workflow. You lose Pinterest *pin-URL* import only; drag-drop, clipboard paste
and direct image URLs continue to work, and the rest of the app is unaffected.
