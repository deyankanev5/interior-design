// Azure Static Web App for Palette Studio.
//
//   az group create --name palette-studio --location westeurope
//   az deployment group create \
//     --resource-group palette-studio \
//     --template-file infra/main.bicep \
//     --parameters name=palette-studio
//
// Then read the deployment token and store it as the GitHub repository secret
// AZURE_STATIC_WEB_APPS_API_TOKEN:
//
//   az staticwebapp secrets list --name palette-studio \
//     --query "properties.apiKey" --output tsv

@description('Name of the Static Web App. Becomes part of the default hostname.')
param name string

@description('Region. Static Web Apps is available in a limited set; westeurope is the closest to the EU/Bulgarian market.')
@allowed([
  'westeurope'
  'northeurope'
  'eastus2'
  'centralus'
  'westus2'
  'eastasia'
])
param location string = 'westeurope'

@description('Free covers a studio-sized deployment. Standard adds a custom-domain SLA, more staging slots and larger Functions.')
@allowed([
  'Free'
  'Standard'
])
param sku string = 'Free'

@description('Azure AI Foundry endpoint, e.g. https://<resource>.openai.azure.com. Leave empty to run without the optional Brief and rationale features.')
param azureAiEndpoint string = ''

@description('Azure AI Foundry deployment name, e.g. gpt-4o-mini.')
param azureAiDeployment string = ''

@description('Azure AI Foundry API key. Pass via --parameters azureAiApiKey=@key.txt or a Key Vault reference; never commit it.')
@secure()
param azureAiApiKey string = ''

@description('Azure AI API version.')
param azureAiApiVersion string = '2024-10-21'

resource site 'Microsoft.Web/staticSites@2023-12-01' = {
  name: name
  location: location
  sku: {
    name: sku
    tier: sku
  }
  properties: {
    // The GitHub Actions workflow in this repo owns the build, so the platform
    // does not need to infer one.
    allowConfigFileUpdates: true
    stagingEnvironmentPolicy: 'Enabled'
  }
}

// Application settings are what the Functions see as process.env. Keeping the
// AI key here rather than in the repository is the whole point: it never
// travels through source control or the browser.
resource settings 'Microsoft.Web/staticSites/config@2023-12-01' = if (!empty(azureAiEndpoint)) {
  parent: site
  name: 'appsettings'
  properties: {
    AZURE_AI_ENDPOINT: azureAiEndpoint
    AZURE_AI_DEPLOYMENT: azureAiDeployment
    AZURE_AI_API_KEY: azureAiApiKey
    AZURE_AI_API_VERSION: azureAiApiVersion
  }
}

output defaultHostname string = site.properties.defaultHostname
output url string = 'https://${site.properties.defaultHostname}'
output resourceName string = site.name
