"use node";

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * RENDER SERVICE DEPLOYMENT
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Creates and deploys services to Render
 */

import { action } from "../_generated/server.js";
import { internal, api } from "../_generated/api.js";
import { v } from "convex/values";
import { RenderClient, type CreateServiceInput, type RenderEnvVar, type RenderService, type RenderDeploy } from "./client.js";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel.d.ts";

/**
 * Create and deploy a new Render service
 */
export const deployService = action({
  args: {
    projectId: v.id("projects"),
    serviceName: v.string(),
    serviceType: v.union(
      v.literal("web_service"),
      v.literal("private_service"),
      v.literal("background_worker"),
      v.literal("cron_job"),
      v.literal("static_site")
    ),
    runtime: v.union(
      v.literal("node"),
      v.literal("docker"),
      v.literal("python"),
      v.literal("ruby"),
      v.literal("go"),
      v.literal("rust"),
      v.literal("elixir")
    ),
    repo: v.optional(v.string()),
    branch: v.optional(v.string()),
    buildCommand: v.optional(v.string()),
    startCommand: v.optional(v.string()),
    envVars: v.optional(v.array(v.object({ key: v.string(), value: v.string() }))),
    region: v.optional(v.union(
      v.literal("oregon"),
      v.literal("frankfurt"),
      v.literal("singapore"),
      v.literal("ohio")
    )),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    serviceId: string;
    deployId: string;
    deploymentId: string;
    serviceUrl?: string;
    status: string;
  }> => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not authenticated",
        code: "UNAUTHENTICATED",
      });
    }

    // Get user from database
    const user: Doc<"users"> | null = await ctx.runQuery(internal.users.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    // Get Render connection
    const connection: { apiKey: string; accountName?: string; accountEmail?: string } | null = 
      await ctx.runMutation(internal.renderConnections.getApiKeyForAction, {
        userId: user._id,
      });

    if (!connection) {
      throw new ConvexError({
        message: "No Render connection found. Please connect your Render account first.",
        code: "NOT_FOUND",
      });
    }

    // Create Render client
    const client: RenderClient = new RenderClient(connection.apiKey);

    // Prepare service input
    const serviceInput: CreateServiceInput = {
      name: args.serviceName,
      type: args.serviceType,
      runtime: args.runtime,
      repo: args.repo,
      branch: args.branch,
      buildCommand: args.buildCommand,
      startCommand: args.startCommand,
      envVars: args.envVars as RenderEnvVar[] | undefined,
      region: args.region,
      autoDeploy: true, // Enable auto-deploy by default
    };

    try {
      // Create service on Render
      const service: RenderService = await client.createService(serviceInput);

      // Trigger initial deploy
      const deploy: RenderDeploy = await client.triggerDeploy(service.id);

      // Create deployment record in database
      const deploymentId: Id<"deployments"> = await ctx.runMutation(api.deployments.createDeployment, {
        projectId: args.projectId,
        providerId: "render",
        deploymentMode: "live",
      });

      // Update deployment status and logs
      await ctx.runMutation(internal.deployments.updateStatus, {
        deploymentId,
        status: "running",
      });

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId,
        message: `🚀 Creating Render service: ${args.serviceName}`,
      });

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId,
        message: `✅ Service created with ID: ${service.id}`,
      });

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId,
        message: `📦 Triggering initial deployment...`,
      });

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId,
        message: `⏳ Deploy ID: ${deploy.id} (Status: ${deploy.status})`,
      });

      return {
        success: true,
        serviceId: service.id,
        deployId: deploy.id,
        deploymentId,
        serviceUrl: service.serviceDetails.url,
        status: deploy.status,
      };
    } catch (error) {
      // Log error and create failed deployment record
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      const deploymentId: Id<"deployments"> = await ctx.runMutation(api.deployments.createDeployment, {
        projectId: args.projectId,
        providerId: "render",
        deploymentMode: "live",
      });

      await ctx.runMutation(internal.deployments.updateStatus, {
        deploymentId,
        status: "failed",
      });

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId,
        message: `❌ Failed to create Render service`,
      });

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId,
        message: `Error: ${errorMessage}`,
      });

      throw new ConvexError({
        message: `Failed to deploy to Render: ${errorMessage}`,
        code: "EXTERNAL_SERVICE_ERROR",
      });
    }
  },
});

/**
 * Get service status from Render
 */
export const getServiceStatus = action({
  args: {
    serviceId: v.string(),
  },
  handler: async (ctx, args): Promise<{
    serviceId: string;
    serviceName: string;
    serviceType: string;
    serviceUrl?: string;
    latestDeploy: {
      id: string;
      status: string;
      createdAt: string;
      finishedAt?: string;
    } | null;
  }> => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not authenticated",
        code: "UNAUTHENTICATED",
      });
    }

    // Get user from database
    const user: Doc<"users"> | null = await ctx.runQuery(internal.users.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    // Get Render connection
    const connection: { apiKey: string; accountName?: string; accountEmail?: string } | null = 
      await ctx.runMutation(internal.renderConnections.getApiKeyForAction, {
        userId: user._id,
      });

    if (!connection) {
      throw new ConvexError({
        message: "No Render connection found",
        code: "NOT_FOUND",
      });
    }

    // Create Render client
    const client: RenderClient = new RenderClient(connection.apiKey);

    try {
      // Get service details
      const service: RenderService = await client.getService(args.serviceId);
      
      // Get latest deploy
      const latestDeploy: RenderDeploy | null = await client.getLatestDeploy(args.serviceId);

      return {
        serviceId: service.id,
        serviceName: service.name,
        serviceType: service.type,
        serviceUrl: service.serviceDetails.url,
        latestDeploy: latestDeploy
          ? {
              id: latestDeploy.id,
              status: latestDeploy.status,
              createdAt: latestDeploy.createdAt,
              finishedAt: latestDeploy.finishedAt,
            }
          : null,
      };
    } catch (error) {
      throw new ConvexError({
        message: `Failed to get service status: ${error instanceof Error ? error.message : "Unknown error"}`,
        code: "EXTERNAL_SERVICE_ERROR",
      });
    }
  },
});
