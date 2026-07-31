#!/usr/bin/env bash
#
# One-shot provisioning for Palette Studio on Azure Static Web Apps.
#
#   ./infra/deploy.sh palette-studio
#
# Creates the resource group and the Static Web App, then prints the deployment
# token to store as the GitHub repository secret AZURE_STATIC_WEB_APPS_API_TOKEN.
# Pushing to main after that triggers the workflow in
# .github/workflows/azure-static-web-apps.yml, which builds and deploys.
#
# Requires the Azure CLI and an authenticated session (`az login`).

set -euo pipefail

NAME="${1:-palette-studio}"
LOCATION="${LOCATION:-westeurope}"
SKU="${SKU:-Free}"
RESOURCE_GROUP="${RESOURCE_GROUP:-$NAME}"

command -v az >/dev/null || {
  echo "The Azure CLI is not installed: https://learn.microsoft.com/cli/azure/install-azure-cli" >&2
  exit 1
}

az account show >/dev/null 2>&1 || {
  echo "Not signed in. Run 'az login' first." >&2
  exit 1
}

echo "Subscription: $(az account show --query name -o tsv)"
echo "Creating resource group '$RESOURCE_GROUP' in $LOCATION…"
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none

echo "Deploying the Static Web App '$NAME'…"
URL=$(az deployment group create \
  --resource-group "$RESOURCE_GROUP" \
  --template-file "$(dirname "$0")/main.bicep" \
  --parameters name="$NAME" location="$LOCATION" sku="$SKU" \
  --query properties.outputs.url.value \
  --output tsv)

TOKEN=$(az staticwebapp secrets list \
  --name "$NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.apiKey" \
  --output tsv)

cat <<EOF

Static Web App ready: $URL

Next, store the deployment token as a repository secret so CI can deploy:

  gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --body '$TOKEN'

or paste it at Settings -> Secrets and variables -> Actions.

The token is scoped to this Static Web App alone; it grants no other access to
the subscription.

To enable the optional Brief and rationale features, set the Azure AI
credentials as application settings so they never enter the repository:

  az staticwebapp appsettings set --name $NAME \\
    --setting-names AZURE_AI_ENDPOINT=https://<resource>.openai.azure.com \\
                    AZURE_AI_DEPLOYMENT=<deployment-name> \\
                    AZURE_AI_API_KEY=<key>
EOF
