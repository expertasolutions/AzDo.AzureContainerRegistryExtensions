import * as tl from 'azure-pipelines-task-lib';
import * as msRestNodeAuth from '@azure/ms-rest-nodeauth';
import * as resourceManagement from '@azure/arm-resources';
import * as auth from '@azure/arm-authorization';
import * as graph from '@azure/graph';

async function LoginToAzure(servicePrincipalId:string, servicePrincipalKey:string, tenantId:string) {
    return await msRestNodeAuth.loginWithServicePrincipalSecret(servicePrincipalId, servicePrincipalKey, tenantId );
};

async function run() {
  let acrSubscriptionEndpoint = tl.getInput("acrSubscriptionEndpoint", true) as string;
  let acrSubcriptionId = tl.getEndpointDataParameter(acrSubscriptionEndpoint, "subscriptionId", false) as string;
  let acrServicePrincipalId = tl.getEndpointAuthorizationParameter(acrSubscriptionEndpoint, "serviceprincipalid", false) as string;
  let acrServicePrincipalKey = tl.getEndpointAuthorizationParameter(acrSubscriptionEndpoint, "serviceprincipalkey", false) as string;
  let acrTenantId = tl.getEndpointAuthorizationParameter(acrSubscriptionEndpoint,"tenantid", false) as string;

  let aksSubscriptionEndpoint = tl.getInput("aksSubscriptionEndpoint", true) as string;
  let aksSubcriptionId = tl.getEndpointDataParameter(aksSubscriptionEndpoint, "subscriptionId", false) as string;
  let aksServicePrincipalId = tl.getEndpointAuthorizationParameter(aksSubscriptionEndpoint, "serviceprincipalid", false) as string;
  let aksServicePrincipalKey = tl.getEndpointAuthorizationParameter(aksSubscriptionEndpoint, "serviceprincipalkey", false) as string;
  let aksTenantId = tl.getEndpointAuthorizationParameter(aksSubscriptionEndpoint,"tenantid", false) as string;

  let registerMode = tl.getInput("registerMode", true) as string;
  let acrResourceGroup = tl.getInput("acrResourceGroupName", true) as string;
  let containerRegistry = tl.getInput("containerRegistry", true) as string;
  let aksResourceGroup = tl.getInput("aksResourceGroupName", true) as string;
  let aksCluster = tl.getInput("aksCluster", true) as string;
  let acrUsername = tl.getInput("acrUsername", false) as string;
  let acrPassword = tl.getInput("acrPassword", false) as string;

  /* ACR Subscription Informations */
  console.log("ACR Azure Subscription Id: " + acrSubcriptionId);
  console.log("ACR ServicePrincipalId: " + acrServicePrincipalId);
  console.log("ACR ServicePrincipalKey: " + acrServicePrincipalKey);
  console.log("ACR Tenant Id: " + acrTenantId);
  /* End of ACR Subscription Informations */

  console.log("");
  /* AKS Subscription Informations */
  console.log("AKS Azure Subscription Id: " + aksSubcriptionId);
  console.log("AKS ServicePrincipalId: " + aksServicePrincipalId);
  console.log("AKS ServicePrincipalKey: " + aksServicePrincipalKey);
  console.log("AKS Tenant Id: " + aksTenantId);
  /* End of AKS Subscription Informations */

  console.log("");
  console.log("Register mode: " + registerMode);
  console.log("ACR Resource Group: '" + acrResourceGroup + "'");
  console.log("Container Registry: " + containerRegistry);
  console.log("AKS Resource Group: " + aksResourceGroup);
  console.log("AKS Cluster: " + aksCluster);

  if(acrUsername != undefined){
      console.log("ACR Username: " + acrUsername);
      console.log("ACR Password: " + acrPassword);
  }

  const aksCreds = await LoginToAzure(aksServicePrincipalId, aksServicePrincipalKey, aksTenantId);
  if(registerMode === "aksSecret") {
    console.log("AKS Secret Access mode");
    throw new Error("AKS Secret access mode not implemented yet");
    /*
        Old Powershell code algo
        $acrInfo = az acr show --name $containerRegistry -g $acrResourceGroup --subscription $acrSubscriptionId | ConvertFrom-Json
        if(-not $acrInfo.adminUserEnabled){
            throw "Container registry named '$containerRegistry' does not have adminUser configured"
        }
    */
  } else {
    console.log("RBAC Access mode");
    console.log("Looking for Azure Kubernetes service cluster ...");

    const aksResourceClient = new resourceManagement.ResourceManagementClient(aksCreds, aksSubcriptionId);
    let rsList = await aksResourceClient.resources.list();
    const aksClusterInstance = rsList.find((element: any) => {
      return element.name === aksCluster;
    });

    let aksInfoResult = await aksResourceClient.resources.getById(aksClusterInstance?.id, '2019-10-01');
    const clientId = aksInfoResult.properties.servicePrincipalProfile.clientId;
    const aksAppCreds = new msRestNodeAuth.ApplicationTokenCredentials(aksCreds.clientId, aksTenantId, aksCreds.secret, 'graph');
    const aksGraphClient = new graph.GraphRbacManagementClient(aksAppCreds, aksTenantId, { baseUri: 'https://graph.windows.net' });
    let aksFilterValue = "appId eq '" + clientId + "'";
    let aksServiceFilter = { filter: aksFilterValue };

    let aksSearch = await aksGraphClient.servicePrincipals.list(aksServiceFilter);
    const aksServicePrincipal = aksSearch.find((element : any) => {
      return element.appId === clientId;
    });

    if(aksServicePrincipal === undefined){
      throw new Error("AKS Service Principal not found");
    }

    // Get the Azure Container Registry Resource infos
  }
}

run();