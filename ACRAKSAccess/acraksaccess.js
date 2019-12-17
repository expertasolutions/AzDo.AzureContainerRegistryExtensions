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
const msRestNodeAuth = require('@azure/ms-rest-nodeauth');
const resourceManagement = require('@azure/arm-resources');
const auth = require('@azure/arm-authorization');
const graph = require('@azure/graph');

try {
    var acrSubscriptionEndpoint = tl.getInput("acrSubscriptionEndpoint", true);
    var acrSubcriptionId = tl.getEndpointDataParameter(acrSubscriptionEndpoint, "subscriptionId", false);
    var acrServicePrincipalId = tl.getEndpointAuthorizationParameter(acrSubscriptionEndpoint, "serviceprincipalid", false);
    var acrServicePrincipalKey = tl.getEndpointAuthorizationParameter(acrSubscriptionEndpoint, "serviceprincipalkey", false);
    var acrTenantId = tl.getEndpointAuthorizationParameter(acrSubscriptionEndpoint,"tenantid", false);

    var aksSubscriptionEndpoint = tl.getInput("aksSubscriptionEndpoint", true);
    var aksSubcriptionId = tl.getEndpointDataParameter(aksSubscriptionEndpoint, "subscriptionId", false);
    var aksServicePrincipalId = tl.getEndpointAuthorizationParameter(aksSubscriptionEndpoint, "serviceprincipalid", false);
    var aksServicePrincipalKey = tl.getEndpointAuthorizationParameter(aksSubscriptionEndpoint, "serviceprincipalkey", false);
    var aksTenantId = tl.getEndpointAuthorizationParameter(aksSubscriptionEndpoint,"tenantid", false);

    var registerMode = tl.getInput("registerMode", true);
    var acrResourceGroup = tl.getInput("acrResourceGroupName", true);
    var containerRegistry = tl.getInput("containerRegistry", true);
    var aksResourceGroup = tl.getInput("aksResourceGroupName", true);
    var aksCluster = tl.getInput("aksCluster", true);
    var acrUsername = tl.getInput("acrUsername", false);
    var acrPassword = tl.getInput("acrPassword", false);

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
    // TODO: Implement codes here :P
    msRestNodeAuth.loginWithServicePrincipalSecret (
        aksServicePrincipalId, aksServicePrincipalKey, aksTenantId
    ).then(aksCreds => {
        if(registerMode == "aksSecret") {
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
            aksResourceClient.resources.list()
                .then(result => {
                    // Find the AKS Cluster Resource group
                    const aksClusterInstance = result.find(element => {
                        return element.name == aksCluster;
                    });

                    aksResourceClient.resources.getById(aksClusterInstance.id, '2019-10-01')
                    .then(aksInfoResult => {
                        const clientId = aksInfoResult.properties.servicePrincipalProfile.clientId;
                        var aksAppCreds = new msRestNodeAuth.ApplicationTokenCredentials(aksCreds.clientId, aksTenantId, aksCreds.secret, 'graph');
                        const aksGraphClient = new graph.GraphRbacManagementClient(aksAppCreds, aksTenantId, { baseUri: 'https://graph.windows.net' });
                        var aksFilterValue = "appId eq '" + clientId + "'";
                        var aksServiceFilter = {
                            filter: aksFilterValue
                        };
                        // Get the AKS Service Principal details
                        aksGraphClient.servicePrincipals.list(aksServiceFilter)
                            .then(aksSearch => {
                                const aksServicePrincipal = aksSearch.find(element => {
                                    return element.appId == clientId;
                                });

                                if(aksServicePrincipal == undefined)
                                {
                                    throw new Error("AKS Server Principal not found");
                                }

                                // Get the Azure Container Registry resource infos
                                msRestNodeAuth.loginWithServicePrincipalSecret(acrServicePrincipalId, acrServicePrincipalKey, acrTenantId
                                ).then(acrCreds => {
                                    
                                    const acrResourceClient = new resourceManagement.ResourceManagementClient(acrCreds, acrSubcriptionId);
                                    acrResourceClient.resources.list()
                                    .then(acrResult => {
                                        const acrInstance = acrResult.find(element => {
                                            return element.name == containerRegistry;
                                        });

                                        if(acrInstance == undefined){
                                            throw new Error("ACR Instance not found");
                                        }

                                        const acrAuthClient = new auth.AuthorizationManagementClient(acrCreds, acrSubcriptionId);
                                        const acrPullRoleName = "AcrPull";

                                        acrAuthClient.roleDefinitions.list("/")
                                        .then(roles => {
                                            var acrRole = roles.find(role => {
                                                return role.roleName == acrPullRoleName;
                                            });

                                            if(acrRole == undefined){
                                                throw new Error("AcrPull not found");
                                            }

                                            acrAuthClient.roleAssignments.listForResourceGroup(acrResourceGroup)
                                            .then(rs => {
                                                
                                                var roleAssignement = rs.find(elm => {
                                                    const rolId = "/subscriptions/" + acrSubcriptionId + acrRole.id;
                                                    return rolId === elm.roleDefinitionId && elm.principalId === aksServicePrincipal.objectId;
                                                });

                                                if(roleAssignement == undefined){
                                                    var newRoleParm = {
                                                        roleDefinitionId: acrRole.id,
                                                        principalId: aksServicePrincipal.objectId
                                                    };

                                                    console.log(newRoleParm);

                                                    acrAuthClient.roleAssignments.create(acrInstance.id, aksServicePrincipal.objectId, newRoleParm)
                                                        .then(newRoleResult => {
                                                            console.log("New role assignement created !");
                                                        }).catch(err=> {
                                                            tl.setResult(tl.TaskResult.Failed, err.message || 'run() failed');
                                                        });
                                                } else {
                                                    console.log("Role assignement already existing");
                                                }
                                            }).catch(err => {
                                                tl.setResult(tl.TaskResult.Failed, err.message || 'run() failed');
                                            });
                                        }).catch(err => {
                                            tl.setResult(tl.TaskResult.Failed, err.message || 'run() failed');
                                        });
                                    })
                                    .catch(err => {
                                        tl.setResult(tl.TaskResult.Failed, err.message || 'run() failed');
                                    })
                                }).catch(err => {
                                    tl.setResult(tl.TaskResult.Failed, err.message || 'run() failed');
                                });
                            })
                            .catch(err => {
                                tl.setResult(tl.TaskResult.Failed, err.message || 'run() failed');
                            });
                    })
                    .catch(err => {
                        tl.setResult(tl.TaskResult.Failed, err.message || 'run() failed');
                    });
                })
                .catch(err => {
                    tl.setResult(tl.TaskResult.Failed, err.message || 'run() failed');
                });
        }
    }).catch(err => {
        tl.setResult(tl.TaskResult.Failed, err.message || 'run() failed');
    });
} catch (err) {
    tl.setResult(tl.TaskResult.Failed, err.message || 'run() failed');
}