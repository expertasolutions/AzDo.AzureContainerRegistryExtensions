"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });

var tl = require('azure-pipelines-task-lib');
const msRestAzureAuth = require('@azure/ms-rest-nodeauth');
const ContainerRegistryManagementClient = require('@azure/arm-containerregistry').ContainerRegistryManagementClient;

try {
    var azureSubscriptionEndpoint = tl.getInput("azureSubscriptionEndpoint", true);
    
    var subcriptionId = tl.getEndpointDataParameter(azureSubscriptionEndpoint, "subscriptionId", false);
    var servicePrincipalId = tl.getEndpointAuthorizationParameter(azureSubscriptionEndpoint, "serviceprincipalid", false);
    var servicePrincipalKey = tl.getEndpointAuthorizationParameter(azureSubscriptionEndpoint, "serviceprincipalkey", false);
    var tenantId = tl.getEndpointAuthorizationParameter(azureSubscriptionEndpoint,"tenantid", false);

    var resourceGroupName = tl.getInput("resourceGroupName", true);
    var containerRegistry = tl.getInput("containerRegistry", true);
    var actionType = tl.getInput("actionType", true);
    var passwordToRenew = tl.getInput("pwdName", true);
    
    console.log("Azure Subscription Id: " + subcriptionId);
    console.log("ServicePrincipalId: " + servicePrincipalId);
    console.log("ServicePrincipalKey: " + servicePrincipalKey);
    console.log("Tenant Id: " + tenantId);
    console.log("Resource Group: " + resourceGroupName);
    console.log("Container Registry: " + containerRegistry);
    console.log("Action Type: " + actionType);
    console.log("Password Name: " + passwordToRenew);
    console.log("");
    
    msRestAzureAuth.loginWithServicePrincipalSecret(
        servicePrincipalId, servicePrincipalKey, 
        tenantId, (err, creds) => {
            if(err){
                throw new Error('Auth error --> ' + err);
            }

            const manager = new ContainerRegistryManagementClient(creds, subcriptionId);
            manager.registries.get(resourceGroupName, containerRegistry)
                .then(result => {
                    if(result.adminUserEnabled == false) {
                        tl.setResult(tl.TaskResult.Failed, "Container registry named " + containerRegistry + " does not have adminUser configured");
                    } else {
                        if(actionType == "show"){
                            manager.registries.listCredentials(resourceGroupName, containerRegistry)
                                .then(rs => {
                                    var pwd1 = rs.passwords[0].value;
                                    var pwd2 = rs.passwords[1].value;
                                    tl.setVariable("username", rs.username, true);
                                    tl.setVariable("password", pwd1, true);
                                    tl.setVariable("password2", pwd2, true);
                                })
                                .catch(err => {
                                    tl.setResult(tl.TaskResult.Failed, err.message || 'run() failed');
                                });
                        } else if(passwordToRenew == "all") {
                            var password = { name: "password" };
                            console.log("Regenerating password ...");
                            manager.registries.regenerateCredential(resourceGroupName, containerRegistry, password)
                                .then(rp1 => {
                                    tl.setVariable("username", rp1.username, true);
                                    var password2 = { name: "password2" };
                                    console.log("Regenerating password2 ...");
                                    manager.registries.regenerateCredential(resourceGroupName, containerRegistry, password2)
                                        .then(rp2 => {
                                            tl.setVariable("password2", rp2.passwords[1].value, true);
                                        })
                                        .catch(err => {
                                            tl.setResult(tl.TaskResult.Failed, err.message || 'run() failed');
                                        });
                                });
                        } else {
                            var password = { name: passwordToRenew };
                            console.log("Regenerating " + passwordToRenew + " ...");
                            manager.registries.regenerateCredential(resourceGroupName, containerRegistry, password)
                                .then(rs => {
                                    var pwd1 = rs.passwords[0].value;
                                    var pwd2 = rs.passwords[1].value;
                                    tl.setVariable("username", rs.username, true);
                                    tl.setVariable("password", pwd1, true);
                                    tl.setVariable("password2", pwd2, true);
                                })
                                .catch(err => {
                                    tl.setResult(tl.TaskResult.Failed, err.message || 'run() failed');
                                });
                        }
                    }
                }).catch(err => {
                    tl.setResult(tl.TaskResult.Failed, err.message || 'run() failed');
                });
        });
} catch (err) {
    tl.setResult(tl.TaskResult.Failed, err.message || 'run() failed');
}