"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var tl = __importStar(require("azure-pipelines-task-lib"));
var msRestNodeAuth = __importStar(require("@azure/ms-rest-nodeauth"));
var resourceManagement = __importStar(require("@azure/arm-resources"));
var auth = __importStar(require("@azure/arm-authorization"));
var graph = __importStar(require("@azure/graph"));
var clusterconnection_1 = require("./src/clusterconnection");
var environmentVariableMaximumSize = 32766;
function LoginToAzure(servicePrincipalId, servicePrincipalKey, tenantId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, msRestNodeAuth.loginWithServicePrincipalSecret(servicePrincipalId, servicePrincipalKey, tenantId)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
;
function runKubeCtlCommand(clusterConnection, command) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, executeKubectlCommand(clusterConnection, "get", "service ")];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
;
function run() {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var acrSubscriptionEndpoint, acrSubcriptionId_1, acrServicePrincipalId, acrServicePrincipalKey, acrTenantId, aksSubscriptionEndpoint, aksSubcriptionId, aksServicePrincipalId, aksServicePrincipalKey, aksTenantId, registerMode, acrResourceGroup, containerRegistry_1, aksResourceGroup, aksCluster_1, acrUsername, acrPassword, aksCreds, clusterconnection_1_1, command_1, kubeconfigfilePath, connection_1, aksResourceClient, rsList, aksClusterInstance, aksInfoResult, clientId_1, aksAppCreds, aksGraphClient, aksFilterValue, aksServiceFilter, aksSearch, aksServicePrincipal_1, acrCreds, acrResourceClient, acrResult, acrInstance, acrAuthClient, acrPullRoleName_1, roles, acrRole_1, rs, roleAssignment, newRoleParm, newRoleResult, err_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 13, , 14]);
                    acrSubscriptionEndpoint = tl.getInput("acrSubscriptionEndpoint", true);
                    acrSubcriptionId_1 = tl.getEndpointDataParameter(acrSubscriptionEndpoint, "subscriptionId", false);
                    acrServicePrincipalId = tl.getEndpointAuthorizationParameter(acrSubscriptionEndpoint, "serviceprincipalid", false);
                    acrServicePrincipalKey = tl.getEndpointAuthorizationParameter(acrSubscriptionEndpoint, "serviceprincipalkey", false);
                    acrTenantId = tl.getEndpointAuthorizationParameter(acrSubscriptionEndpoint, "tenantid", false);
                    aksSubscriptionEndpoint = tl.getInput("aksSubscriptionEndpoint", true);
                    aksSubcriptionId = tl.getEndpointDataParameter(aksSubscriptionEndpoint, "subscriptionId", false);
                    aksServicePrincipalId = tl.getEndpointAuthorizationParameter(aksSubscriptionEndpoint, "serviceprincipalid", false);
                    aksServicePrincipalKey = tl.getEndpointAuthorizationParameter(aksSubscriptionEndpoint, "serviceprincipalkey", false);
                    aksTenantId = tl.getEndpointAuthorizationParameter(aksSubscriptionEndpoint, "tenantid", false);
                    registerMode = tl.getInput("registerMode", true);
                    acrResourceGroup = tl.getInput("acrResourceGroupName", true);
                    containerRegistry_1 = tl.getInput("containerRegistry", true);
                    aksResourceGroup = tl.getInput("aksResourceGroupName", true);
                    aksCluster_1 = tl.getInput("aksCluster", true);
                    acrUsername = tl.getInput("acrUsername", false);
                    acrPassword = tl.getInput("acrPassword", false);
                    /* ACR Subscription Informations */
                    console.log("ACR Azure Subscription Id: " + acrSubcriptionId_1);
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
                    console.log("Container Registry: " + containerRegistry_1);
                    console.log("AKS Resource Group: " + aksResourceGroup);
                    console.log("AKS Cluster: " + aksCluster_1);
                    if (acrUsername != undefined) {
                        console.log("ACR Username: " + acrUsername);
                        console.log("ACR Password: " + acrPassword);
                    }
                    return [4 /*yield*/, LoginToAzure(aksServicePrincipalId, aksServicePrincipalKey, aksTenantId)];
                case 1:
                    aksCreds = _b.sent();
                    if (!(registerMode === "aksSecret")) return [3 /*break*/, 2];
                    clusterconnection_1_1 = require("./clusterconnection");
                    command_1 = "get";
                    kubeconfigfilePath = "";
                    if (command_1 === "logout") {
                        kubeconfigfilePath = tl.getVariable("KUBECONFIG");
                    }
                    connection_1 = new clusterconnection_1_1.default(kubeconfigfilePath);
                    try {
                        console.log(connection_1);
                        connection_1.open().then(function () {
                            return runKubeCtlCommand(connection_1, command_1);
                        })
                            .then(function () {
                            if (command_1 !== "login") {
                                connection_1.close();
                            }
                        }).catch(function (error) {
                            tl.setResult(tl.TaskResult.Failed, error.message);
                            connection_1.close();
                        });
                    }
                    catch (error) {
                        tl.setResult(tl.TaskResult.Failed, error.message);
                    }
                    return [3 /*break*/, 12];
                case 2:
                    console.log("RBAC Access mode");
                    console.log("Looking for Azure Kubernetes service cluster ...");
                    aksResourceClient = new resourceManagement.ResourceManagementClient(aksCreds, aksSubcriptionId);
                    return [4 /*yield*/, aksResourceClient.resources.list()];
                case 3:
                    rsList = _b.sent();
                    aksClusterInstance = rsList.find(function (element) {
                        return element.name === aksCluster_1;
                    });
                    return [4 /*yield*/, aksResourceClient.resources.getById((_a = aksClusterInstance) === null || _a === void 0 ? void 0 : _a.id, '2019-10-01')];
                case 4:
                    aksInfoResult = _b.sent();
                    clientId_1 = aksInfoResult.properties.servicePrincipalProfile.clientId;
                    aksAppCreds = new msRestNodeAuth.ApplicationTokenCredentials(aksCreds.clientId, aksTenantId, aksCreds.secret, 'graph');
                    aksGraphClient = new graph.GraphRbacManagementClient(aksAppCreds, aksTenantId, { baseUri: 'https://graph.windows.net' });
                    aksFilterValue = "appId eq '" + clientId_1 + "'";
                    aksServiceFilter = { filter: aksFilterValue };
                    return [4 /*yield*/, aksGraphClient.servicePrincipals.list(aksServiceFilter)];
                case 5:
                    aksSearch = _b.sent();
                    aksServicePrincipal_1 = aksSearch.find(function (element) {
                        return element.appId === clientId_1;
                    });
                    if (aksServicePrincipal_1 === undefined) {
                        throw new Error("AKS Service Principal not found");
                    }
                    return [4 /*yield*/, LoginToAzure(acrServicePrincipalId, acrServicePrincipalKey, acrTenantId)];
                case 6:
                    acrCreds = _b.sent();
                    acrResourceClient = new resourceManagement.ResourceManagementClient(acrCreds, acrSubcriptionId_1);
                    return [4 /*yield*/, acrResourceClient.resources.list()];
                case 7:
                    acrResult = _b.sent();
                    acrInstance = acrResult.find(function (element) {
                        return element.name === containerRegistry_1;
                    });
                    if (acrInstance === undefined) {
                        throw new Error("Azure Container Registry instance not found");
                    }
                    acrAuthClient = new auth.AuthorizationManagementClient(acrCreds, acrSubcriptionId_1);
                    acrPullRoleName_1 = "AcrPull";
                    return [4 /*yield*/, acrAuthClient.roleDefinitions.list("/")];
                case 8:
                    roles = _b.sent();
                    acrRole_1 = roles.find(function (role) {
                        return role.roleName === acrPullRoleName_1;
                    });
                    if (acrRole_1 === undefined) {
                        throw new Error("AcrPull not found");
                    }
                    return [4 /*yield*/, acrAuthClient.roleAssignments.listForResourceGroup(acrResourceGroup)];
                case 9:
                    rs = _b.sent();
                    roleAssignment = rs.find(function (elm) {
                        var _a;
                        var rolId = "/subscriptions/" + acrSubcriptionId_1 + acrRole_1.id;
                        return rolId === elm.roleDefinitionId && elm.principalId === ((_a = aksServicePrincipal_1) === null || _a === void 0 ? void 0 : _a.objectId);
                    });
                    if (!(roleAssignment === undefined)) return [3 /*break*/, 11];
                    newRoleParm = {
                        roleDefinitionId: acrRole_1.id,
                        principalId: aksServicePrincipal_1.objectId
                    };
                    console.log(newRoleParm);
                    return [4 /*yield*/, acrAuthClient.roleAssignments.create(acrInstance.id, aksServicePrincipal_1.objectId, newRoleParm)];
                case 10:
                    newRoleResult = _b.sent();
                    if (newRoleResult != undefined) {
                        console.log("New role assignement created!");
                    }
                    return [3 /*break*/, 12];
                case 11:
                    console.log("Role assignement already existing");
                    _b.label = 12;
                case 12: return [3 /*break*/, 14];
                case 13:
                    err_1 = _b.sent();
                    tl.setResult(tl.TaskResult.Failed, err_1.message || 'run() failed');
                    return [3 /*break*/, 14];
                case 14: return [2 /*return*/];
            }
        });
    });
}
function executeKubectlCommand(clusterConnection, command, args) {
    return __awaiter(this, void 0, void 0, function () {
        var commandImplementation, telemetry, result;
        return __generator(this, function (_a) {
            commandImplementation = require("./kubernetescommand");
            if (command === "login") {
                commandImplementation = "./kuberneteslogin";
            }
            else if (command === "logout") {
                commandImplementation = "./kuberneteslogout";
            }
            telemetry = {
                registryType: "Azure Container Registry",
                command: command
            };
            console.log("##vso[telemetry.publish area=%s;feature=%s]%s", "TaskEndpointId", "KubernetesV1", JSON.stringify(telemetry));
            result = "";
            return [2 /*return*/, commandImplementation.run(clusterConnection, command, args, function (data) { return result += data; })
                    .fin(function cleanup() {
                    var commandOutputLength = result.length;
                    if (commandOutputLength > environmentVariableMaximumSize) {
                        tl.warning(tl.loc("OutputVariableDataSizeExceeded", commandOutputLength, environmentVariableMaximumSize));
                    }
                    else {
                        tl.setVariable('podServiceContent', result);
                    }
                })];
        });
    });
}
run();
