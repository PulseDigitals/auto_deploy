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
import type * as costEstimation from "../costEstimation.js";
import type * as costGuardrails from "../costGuardrails.js";
import type * as costGuardrailsPublic from "../costGuardrailsPublic.js";
import type * as costOptimization from "../costOptimization.js";
import type * as deploymentIntelligence from "../deploymentIntelligence.js";
import type * as deployments from "../deployments.js";
import type * as domains from "../domains.js";
import type * as http from "../http.js";
import type * as manifests from "../manifests.js";
import type * as oauth_vercel from "../oauth/vercel.js";
import type * as projects from "../projects.js";
import type * as providerAuthHelpers from "../providerAuthHelpers.js";
import type * as providerTokens from "../providerTokens.js";
import type * as providers_registry from "../providers/registry.js";
import type * as providers_simulator from "../providers/simulator.js";
import type * as providers_types from "../providers/types.js";
import type * as providers_vercelAdapter from "../providers/vercelAdapter.js";
import type * as users from "../users.js";
import type * as vercel_client from "../vercel/client.js";
import type * as vercel_createProject from "../vercel/createProject.js";
import type * as vercel_deploy from "../vercel/deploy.js";
import type * as vercel_liveDeployment from "../vercel/liveDeployment.js";
import type * as vercel_liveDeploymentHelpers from "../vercel/liveDeploymentHelpers.js";
import type * as vercel_liveDeploymentPolling from "../vercel/liveDeploymentPolling.js";
import type * as vercel_pollStatus from "../vercel/pollStatus.js";
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
  costEstimation: typeof costEstimation;
  costGuardrails: typeof costGuardrails;
  costGuardrailsPublic: typeof costGuardrailsPublic;
  costOptimization: typeof costOptimization;
  deploymentIntelligence: typeof deploymentIntelligence;
  deployments: typeof deployments;
  domains: typeof domains;
  http: typeof http;
  manifests: typeof manifests;
  "oauth/vercel": typeof oauth_vercel;
  projects: typeof projects;
  providerAuthHelpers: typeof providerAuthHelpers;
  providerTokens: typeof providerTokens;
  "providers/registry": typeof providers_registry;
  "providers/simulator": typeof providers_simulator;
  "providers/types": typeof providers_types;
  "providers/vercelAdapter": typeof providers_vercelAdapter;
  users: typeof users;
  "vercel/client": typeof vercel_client;
  "vercel/createProject": typeof vercel_createProject;
  "vercel/deploy": typeof vercel_deploy;
  "vercel/liveDeployment": typeof vercel_liveDeployment;
  "vercel/liveDeploymentHelpers": typeof vercel_liveDeploymentHelpers;
  "vercel/liveDeploymentPolling": typeof vercel_liveDeploymentPolling;
  "vercel/pollStatus": typeof vercel_pollStatus;
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
