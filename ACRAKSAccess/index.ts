import * as tl from 'azure-pipelines-task-lib';
import * as msRest from '@azure/ms-rest-js';
import * as msRestNodeAuth from '@azure/ms-rest-nodeauth';
import * as resourceManagement from '@azure/arm-resources';
import * as auth from '@azure/arm-authorization';
import * as graph from '@azure/graph';
import * as kubectlUtility from 'utility-common/kubectlutility';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as https from 'https';

async function LoginToAzure(servicePrincipalId:string, servicePrincipalKey:string, tenantId:string) {
    return await msRestNodeAuth.loginWithServicePrincipalSecret(servicePrincipalId, servicePrincipalKey, tenantId );
};

async function kubectl(cmd:string, namespace:[], configFile:[],type:string, line:string, kubectlPath:string) {
  let kubectlCmd = tl.tool(kubectlPath);

  kubectlCmd.arg(cmd);
  kubectlCmd.arg(namespace);
  kubectlCmd.arg(configFile);
  kubectlCmd.line(type)
  kubectlCmd.line(line);
  
  if(cmd !== "delete" ) {
    kubectlCmd.line("-o json");
  }

  kubectlCmd.on("stout", output => {
    console.log("stdout called");
  });

  let outputResult = JSON.parse(kubectlCmd.execSync().stdout);
  
  console.log("outputResult: " + outputResult);
  return outputResult;
}

function httpsGetRequest(httpsOptions:any) {
  return new Promise((resolve, reject) => {
    const req = https.request(httpsOptions, (response) => {
      let data:any[] = [];
    
      response.on('data', d => {
        data.push(d);
      });

      response.on('end', () => {
        let response_body = Buffer.concat(data);
        resolve(response_body.toString());
      });

      response.on('error', err => {
        reject(err);
      });
    });

    
    req.end();
  });  
}

function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

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

    //----------------------------------------------------------------------------------------------------
    console.log("Looking for Azure Kubernetes service cluster ...");
    const aksCreds:any = await LoginToAzure(aksServicePrincipalId, aksServicePrincipalKey, aksTenantId);
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
    //----------------------------------------------------------------------------------------------------

    if(registerMode === "aksSecret") {

      console.log("Kubernetes Secret Access mode");

      let kubectlPath = tl.which("kubectl", false);
      let kubectlVersion = await kubectlUtility.getStableKubectlVersion();
      let tmpDir = path.join(tl.getVariable('agent.tempDirectory') || os.tmpdir(), "kubectlTask");
      if(!fs.existsSync(tmpDir)){
        fs.mkdirSync(tmpDir);
      }
      let userDir = path.join(tmpDir, new Date().getTime().toString());
      if(!fs.existsSync(userDir)){
        fs.mkdirSync(userDir);
      }

      let kubectlDownload = await kubectlUtility.downloadKubectl(kubectlVersion);
      kubectlPath = kubectlDownload;
      
      let bearerToken = aksCreds.tokenCache._entries[0].accessToken;

      let apiVersion = "2020-02-01"
      let apiPath = "/subscriptions/" + aksSubcriptionId + "/resourceGroups/" + aksResourceGroup + "/providers/Microsoft.ContainerService/managedClusters/" + aksCluster + "/accessProfiles/clusterUser?api-version=" + apiVersion;
      let getOptions = {
        hostname: 'management.azure.com',
        port: 443,
        path: apiPath,
        method: 'GET',
        headers: {
          Authorization: ' Bearer ' + bearerToken
        }
      };

      let httpResponse = await httpsGetRequest(getOptions);
      let rawKubeConfig = JSON.parse(httpResponse as string).properties.kubeConfig;
      let base64KubeConfig = Buffer.from(rawKubeConfig, 'base64');

      let kubeConfig = base64KubeConfig.toString();
      let kubeConfigFile = path.join(userDir, "config");
      fs.writeFileSync(kubeConfigFile, kubeConfig);
      process.env["KUBECONFIG"] = kubeConfigFile;

      let secretName = "testlouis";
      let dockerServer = "patate";
      let dockerUsername = "test";
      let dockerPassword = "pwd";

      try {

        let cmdFindSecret = await kubectl("get", [], [], "secret","", kubectlPath);
        if(cmdFindSecret.items.find((elm:any) => elm.metadata.name === secretName)) {
          console.log("Secret: " + secretName + " is found");
          await kubectl("delete", [], [], "secret", secretName, kubectlPath);
        } else {
          console.log("Secret " + secretName + " isn't found");
        }
          
        await delay(3000);

        let cmdCreateSecret = await kubectl("create", [], [], "secret","docker-registry " + secretName + " --docker-server=" + dockerServer + " --docker-username=" + dockerUsername + " --docker-password=" + dockerPassword, kubectlPath);
        console.log("Create Secret Result: " + cmdCreateSecret);
        console.log("Secret " + secretName + " has been created!");

      } catch {
        throw new Error("global error from kubectlCmd");
      } finally {
        if(kubeConfigFile != null && fs.existsSync(kubeConfigFile)) {
          delete process.env["KUBECONFIG"];
          fs.unlinkSync(kubeConfigFile);
        }
      }
      
      throw new Error("AKS Secret access mode not implemented yet");

      tl.setVariable("imagePullSecretName", secretName, true);

    } else {
      console.log("RBAC Access mode");
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

run();
