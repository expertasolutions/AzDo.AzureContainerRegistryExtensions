import * as tl from 'azure-pipelines-task-lib';
import * as msRest from '@azure/ms-rest-js';
import * as msRestNodeAuth from '@azure/ms-rest-nodeauth';
import * as resourceManagement from '@azure/arm-resources';
import * as auth from '@azure/arm-authorization';
import * as graph from '@azure/graph';

const clusterconnection_1 = require("./src/clusterconnection");
const environmentVariableMaximumSize = 32766;

async function LoginToAzure(servicePrincipalId:string, servicePrincipalKey:string, tenantId:string) {
    return await msRestNodeAuth.loginWithServicePrincipalSecret(servicePrincipalId, servicePrincipalKey, tenantId );
};

async function runKubeCtlCommand(clusterConnection:any, command:string) {
  return await executeKubectlCommand(clusterConnection, "get", "service ");
};

async function run() {
  try { 
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

    if(acrUsername != undefined) {
        console.log("ACR Username: " + acrUsername);
        console.log("ACR Password: " + acrPassword);
    }

    const aksCreds:any = await LoginToAzure(aksServicePrincipalId, aksServicePrincipalKey, aksTenantId);
    if(registerMode === "aksSecret") {
      const clusterconnection_1 = require("./clusterconnection");

      let command = "get";
      let kubeconfigfilePath:any = "";
      if (command === "logout") {
          kubeconfigfilePath = tl.getVariable("KUBECONFIG");
      }

      let connection = new clusterconnection_1.default(kubeconfigfilePath);

      try {
        console.log(connection);
        connection.open().then(() => {
            return runKubeCtlCommand(connection, command);
        })
        .then(() => {
            if (command !== "login") {
                connection.close();
            }
        }).catch((error:any) => {
            tl.setResult(tl.TaskResult.Failed, error.message);
            connection.close();
        });
      } catch(error) {
        tl.setResult(tl.TaskResult.Failed, error.message);
      }

      //tl.setVariable("imagePullSecretName", "patate", true);

    } else {
      console.log("RBAC Access mode");
      console.log("Looking for Azure Kubernetes service cluster ...");

      let aksResourceClient = new resourceManagement.ResourceManagementClient(aksCreds, aksSubcriptionId);
      let rsList = await aksResourceClient.resources.list();
      let aksClusterInstance:any = rsList.find((element: any) => {
        return element.name === aksCluster;
      });

      let aksInfoResult = await aksResourceClient.resources.getById(aksClusterInstance?.id, '2019-10-01');
      const clientId = aksInfoResult.properties.servicePrincipalProfile.clientId;
      let aksAppCreds:any = new msRestNodeAuth.ApplicationTokenCredentials(aksCreds.clientId, aksTenantId, aksCreds.secret, 'graph');
      let aksGraphClient = new graph.GraphRbacManagementClient(aksAppCreds, aksTenantId, { baseUri: 'https://graph.windows.net' });
      let aksFilterValue = "appId eq '" + clientId + "'";
      let aksServiceFilter = { filter: aksFilterValue };

      let aksSearch = await aksGraphClient.servicePrincipals.list(aksServiceFilter);
      let aksServicePrincipal:any = aksSearch.find((element : any) => {
        return element.appId === clientId;
      });

      if(aksServicePrincipal === undefined){
        throw new Error("AKS Service Principal not found");
      }

      // Get the Azure Container Registry Resource infos
      let acrCreds:any = await LoginToAzure(acrServicePrincipalId, acrServicePrincipalKey, acrTenantId);
      let acrResourceClient = new resourceManagement.ResourceManagementClient(acrCreds, acrSubcriptionId);
      let acrResult = await acrResourceClient.resources.list();
      let acrInstance:any = acrResult.find((element:any)=> {
        return element.name === containerRegistry;
      });
      
      if(acrInstance === undefined){
        throw new Error("Azure Container Registry instance not found");
      }

      let acrAuthClient = new auth.AuthorizationManagementClient(acrCreds, acrSubcriptionId);
      const acrPullRoleName = "AcrPull";
      let roles = await acrAuthClient.roleDefinitions.list("/");
      let acrRole:any = roles.find((role:any)=> {
        return role.roleName === acrPullRoleName;
      });

      if(acrRole === undefined){
        throw new Error("AcrPull not found");
      }

      let rs = await acrAuthClient.roleAssignments.listForResourceGroup(acrResourceGroup);
      let roleAssignment = rs.find((elm:any)=> {
        const rolId = "/subscriptions/" + acrSubcriptionId + acrRole.id;
        return rolId === elm.roleDefinitionId && elm.principalId === aksServicePrincipal?.objectId;
      });

      if(roleAssignment === undefined){
        var newRoleParm = {
          roleDefinitionId: acrRole.id,
          principalId: aksServicePrincipal.objectId
        };

        console.log(newRoleParm);

        let newRoleResult = await acrAuthClient.roleAssignments.create(acrInstance.id, aksServicePrincipal.objectId, newRoleParm);
        if(newRoleResult != undefined){
          console.log("New role assignement created!");
        }
      } else {
        console.log("Role assignement already existing");
      }
    }
  } catch (err) {
    tl.setResult(tl.TaskResult.Failed, err.message || 'run() failed');
  }
}

async function executeKubectlCommand(clusterConnection:any, command:string, args:string) {
  var commandImplementation = require("./kubernetescommand");

  if(command === "login") {
    commandImplementation = "./kuberneteslogin";
  } else if(command === "logout") {
    commandImplementation = "./kuberneteslogout";
  }

  var telemetry = {
    registryType: "Azure Container Registry",
    command: command
  };

  console.log("##vso[telemetry.publish area=%s;feature=%s]%s", "TaskEndpointId", "KubernetesV1", JSON.stringify(telemetry));
  var result = "";
  return commandImplementation.run(clusterConnection, command, args, (data:any) => result += data)
      .fin(function cleanup() {
          var commandOutputLength = result.length;
          if (commandOutputLength > environmentVariableMaximumSize) {
            tl.warning(tl.loc("OutputVariableDataSizeExceeded", commandOutputLength, environmentVariableMaximumSize));
          }
          else {
            tl.setVariable('podServiceContent', result);
          }
      });
  }
  
run();