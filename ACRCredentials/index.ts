import * as tl from 'azure-pipelines-task-lib/task';
import * as msRestNodeAuth from '@azure/ms-rest-nodeauth';
import * as msACR from '@azure/arm-containerregistry';

async function LoginToAzure(servicePrincipalId:string, servicePrincipalKey:string, tenantId:string) {
    return await msRestNodeAuth.loginWithServicePrincipalSecret(servicePrincipalId, servicePrincipalKey, tenantId );
};

async function run() {
  try {

    let azureSubscriptionEndpoint = tl.getInput("azureSubscriptionEndpoint", true) as string;

    let subcriptionId = tl.getEndpointDataParameter(azureSubscriptionEndpoint, "subscriptionId", false) as string;
    let servicePrincipalId = tl.getEndpointAuthorizationParameter(azureSubscriptionEndpoint, "serviceprincipalid", false) as string;
    let servicePrincipalKey = tl.getEndpointAuthorizationParameter(azureSubscriptionEndpoint, "serviceprincipalkey", false) as string;
    let tenantId = tl.getEndpointAuthorizationParameter(azureSubscriptionEndpoint,"tenantid", false) as string;

    let resourceGroupName = tl.getInput("resourceGroupName", true) as string;
    let containerRegistry = tl.getInput("containerRegistry", true) as string;
    let actionType = tl.getInput("actionType", true) as string;
    let passwordToRenew = tl.getInput("pwdName", true) as string;
    
    console.log("Azure Subscription Id: " + subcriptionId);
    console.log("ServicePrincipalId: " + servicePrincipalId);
    console.log("ServicePrincipalKey: " + servicePrincipalKey);
    console.log("Tenant Id: " + tenantId);
    console.log("Resource Group: " + resourceGroupName);
    console.log("Container Registry: " + containerRegistry);
    console.log("Action Type: " + actionType);
    console.log("Password Name: " + passwordToRenew);
    console.log("");

    const azureCredentials = await LoginToAzure(servicePrincipalId, servicePrincipalKey, tenantId);
    const manager = new msACR.ContainerRegistryManagementClient(azureCredentials, subcriptionId);
    let getResult = await manager.registries.get(resourceGroupName, containerRegistry);
    if(getResult.adminUserEnabled === false){
      tl.setResult(tl.TaskResult.Failed, "Container registry named " + containerRegistry + " does not have adminUser configured");
    } else {
      if(actionType === "show"){
        let credsList = await manager.registries.listCredentials(resourceGroupName, containerRegistry);
        var pwd1 = credsList.passwords[0].value;
        var pwd2 = credsList.passwords[1].value;
        tl.setVariable("username", credsList.username, true);
        tl.setVariable("password", pwd1, true);
        tl.setVariable("password2", pwd2, true);
      } else if(passwordToRenew == "all") {
        // Password 1
        var password = <msACR.ContainerRegistryManagementModels.RegenerateCredentialParameters>{ name: "password" };
        console.log("Regenerating password ...");
        let genResult = await manager.registries.regenerateCredential(resourceGroupName, containerRegistry, password);
        tl.setVariable("username", genResult.username, true);

        // Password 2
        var password2 = <msACR.ContainerRegistryManagementModels.RegenerateCredentialParameters>{ name: "password2" };
        console.log("Regenerating password2 ...");
        let genResult2 = await manager.registries.regenerateCredential(resourceGroupName, containerRegistry, password2)
        tl.setVariable("password2", genResult2.passwords[1].value, true);
      } else {
        let password = <msACR.ContainerRegistryManagementModels.RegenerateCredentialParameters>{ name: passwordToRenew };
        console.log("Regenerating " + passwordToRenew + " ...");
        let genResult = await manager.registries.regenerateCredential(resourceGroupName, containerRegistry, password);
        var pwd1 = genResult.passwords[0].value;
        var pwd2 = genResult.passwords[1].value;
        tl.setVariable("username", genResult.username, true);
        tl.setVariable("password", pwd1, true);
        tl.setVariable("password2", pwd2, true);
      }
    }

  } catch (err) {
    tl.setResult(tl.TaskResult.Failed, err.message || 'run() failed');
  }
}

run();