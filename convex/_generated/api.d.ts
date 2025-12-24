/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiInsights from "../aiInsights.js";
import type * as aiInsightsHelpers from "../aiInsightsHelpers.js";
import type * as analyzeCodebase from "../analyzeCodebase.js";
import type * as autoDeployment from "../autoDeployment.js";
import type * as autoDeploymentTrigger from "../autoDeploymentTrigger.js";
import type * as costEstimation from "../costEstimation.js";
import type * as costGuardrails from "../costGuardrails.js";
import type * as costGuardrailsPublic from "../costGuardrailsPublic.js";
import type * as costOptimization from "../costOptimization.js";
import type * as deploymentIntelligence from "../deploymentIntelligence.js";
import type * as deployments from "../deployments.js";
import type * as domains from "../domains.js";
import type * as hostingIntelligence from "../hostingIntelligence.js";
import type * as http from "../http.js";
import type * as manifests from "../manifests.js";
import type * as oauth_vercel from "../oauth/vercel.js";
import type * as platformReleases from "../platformReleases.js";
import type * as projects from "../projects.js";
import type * as providerAuthHelpers from "../providerAuthHelpers.js";
import type * as providerTokens from "../providerTokens.js";
import type * as providers_registry from "../providers/registry.js";
import type * as providers_renderAdapter from "../providers/renderAdapter.js";
import type * as providers_simulator from "../providers/simulator.js";
import type * as providers_types from "../providers/types.js";
import type * as providers_vercelAdapter from "../providers/vercelAdapter.js";
import type * as render_client from "../render/client.js";
import type * as render_codebaseAnalyzer from "../render/codebaseAnalyzer.js";
import type * as render_deploy from "../render/deploy.js";
import type * as render_liveDeployment from "../render/liveDeployment.js";
import type * as render_liveDeploymentPolling from "../render/liveDeploymentPolling.js";
import type * as render_validateApiKey from "../render/validateApiKey.js";
import type * as renderConnections from "../renderConnections.js";
import type * as userManagement from "../userManagement.js";
import type * as users from "../users.js";
import type * as vercel_autoDeployOrchestrator from "../vercel/autoDeployOrchestrator.js";
import type * as vercel_client from "../vercel/client.js";
import type * as vercel_createProject from "../vercel/createProject.js";
import type * as vercel_deploy from "../vercel/deploy.js";
import type * as vercel_deployFromGitHub from "../vercel/deployFromGitHub.js";
import type * as vercel_deployFromZip from "../vercel/deployFromZip.js";
import type * as vercel_fetchTeams from "../vercel/fetchTeams.js";
import type * as vercel_liveDeployment from "../vercel/liveDeployment.js";
import type * as vercel_liveDeploymentHelpers from "../vercel/liveDeploymentHelpers.js";
import type * as vercel_liveDeploymentPolling from "../vercel/liveDeploymentPolling.js";
import type * as vercel_pollStatus from "../vercel/pollStatus.js";
import type * as vercel_updateProject from "../vercel/updateProject.js";
import type * as vercelConnections from "../vercelConnections.js";
import type * as zipUpload from "../zipUpload.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiInsights: typeof aiInsights;
  aiInsightsHelpers: typeof aiInsightsHelpers;
  analyzeCodebase: typeof analyzeCodebase;
  autoDeployment: typeof autoDeployment;
  autoDeploymentTrigger: typeof autoDeploymentTrigger;
  costEstimation: typeof costEstimation;
  costGuardrails: typeof costGuardrails;
  costGuardrailsPublic: typeof costGuardrailsPublic;
  costOptimization: typeof costOptimization;
  deploymentIntelligence: typeof deploymentIntelligence;
  deployments: typeof deployments;
  domains: typeof domains;
  hostingIntelligence: typeof hostingIntelligence;
  http: typeof http;
  manifests: typeof manifests;
  "oauth/vercel": typeof oauth_vercel;
  platformReleases: typeof platformReleases;
  projects: typeof projects;
  providerAuthHelpers: typeof providerAuthHelpers;
  providerTokens: typeof providerTokens;
  "providers/registry": typeof providers_registry;
  "providers/renderAdapter": typeof providers_renderAdapter;
  "providers/simulator": typeof providers_simulator;
  "providers/types": typeof providers_types;
  "providers/vercelAdapter": typeof providers_vercelAdapter;
  "render/client": typeof render_client;
  "render/codebaseAnalyzer": typeof render_codebaseAnalyzer;
  "render/deploy": typeof render_deploy;
  "render/liveDeployment": typeof render_liveDeployment;
  "render/liveDeploymentPolling": typeof render_liveDeploymentPolling;
  "render/validateApiKey": typeof render_validateApiKey;
  renderConnections: typeof renderConnections;
  userManagement: typeof userManagement;
  users: typeof users;
  "vercel/autoDeployOrchestrator": typeof vercel_autoDeployOrchestrator;
  "vercel/client": typeof vercel_client;
  "vercel/createProject": typeof vercel_createProject;
  "vercel/deploy": typeof vercel_deploy;
  "vercel/deployFromGitHub": typeof vercel_deployFromGitHub;
  "vercel/deployFromZip": typeof vercel_deployFromZip;
  "vercel/fetchTeams": typeof vercel_fetchTeams;
  "vercel/liveDeployment": typeof vercel_liveDeployment;
  "vercel/liveDeploymentHelpers": typeof vercel_liveDeploymentHelpers;
  "vercel/liveDeploymentPolling": typeof vercel_liveDeploymentPolling;
  "vercel/pollStatus": typeof vercel_pollStatus;
  "vercel/updateProject": typeof vercel_updateProject;
  vercelConnections: typeof vercelConnections;
  zipUpload: typeof zipUpload;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
