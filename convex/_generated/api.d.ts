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
import type * as manifests from "../manifests.js";
import type * as projects from "../projects.js";
import type * as users from "../users.js";
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
  manifests: typeof manifests;
  projects: typeof projects;
  users: typeof users;
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
