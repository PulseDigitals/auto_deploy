"use node";

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * RENDER LIVE DEPLOYMENT ORCHESTRATOR
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Orchestrates live deployments to Render
 */

import { internalAction } from "../_generated/server.js";
import { internal } from "../_generated/api.js";
import { v } from "convex/values";
import { RenderClient, type CreateServiceInput, type RenderEnvVar } from "./client.js";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel.d.ts";

/**
 * Execute live deployment to Render
 * Entry point from deployment pipeline
 */
export const executeLiveDeployment = internalAction({
  args: {
    deploymentId: v.id("deployments"),
  },
  handler: async (ctx, args) => {
    // Get deployment record
    const deployment: Doc<"deployments"> | null = await ctx.runQuery(
      internal.deployments.getDeploymentById,
      { deploymentId: args.deploymentId }
    );

    if (!deployment) {
      throw new ConvexError({
        message: "Deployment not found",
        code: "NOT_FOUND",
      });
    }

    // Get project
    const project = await ctx.runQuery(
      internal.projects.getProjectById,
      { projectId: deployment.projectId }
    );

    if (!project) {
      throw new ConvexError({
        message: "Project not found",
        code: "NOT_FOUND",
      });
    }

    // Get user
    if (!deployment.userId) {
      await ctx.runMutation(internal.deployments.updateStatus, {
        deploymentId: args.deploymentId,
        status: "failed",
        log: "❌ No user associated with deployment",
      });
      return;
    }

    // Get Render connection
    const connection: { apiKey: string; accountName?: string; accountEmail?: string } | null = 
      await ctx.runMutation(internal.renderConnections.getApiKeyForAction, {
        userId: deployment.userId,
      });

    if (!connection) {
      await ctx.runMutation(internal.deployments.updateStatus, {
        deploymentId: args.deploymentId,
        status: "failed",
        log: "❌ No Render connection found. Please connect Render in Settings.",
      });
      return;
    }

    // Create Render client
    const client: RenderClient = new RenderClient(connection.apiKey);

    try {
      // Update status to running
      await ctx.runMutation(internal.deployments.updateStatus, {
        deploymentId: args.deploymentId,
        status: "running",
        log: `🚀 Starting LIVE deployment to Render...`,
      });

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `📦 Creating Render service for: ${project.name}`,
      });

      // Prepare service configuration
      // For now, create a basic static site - users can extend this later
      const serviceName = project.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 40);
      
      const serviceInput: CreateServiceInput = {
        name: serviceName,
        type: "static_site",
        runtime: "node",
        buildCommand: "npm run build",
        region: "oregon",
        autoDeploy: true,
      };

      // If project has a git repo, use it
      if (project.gitRepoUrl) {
        serviceInput.repo = project.gitRepoUrl;
        serviceInput.branch = "main"; // Default branch
      }

      // Create service on Render
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `⚙️ Configuring service: ${serviceName}`,
      });

      const service = await client.createService(serviceInput);

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `✅ Service created with ID: ${service.id}`,
      });

      // Trigger initial deploy
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `🔨 Triggering initial deployment...`,
      });

      const deploy = await client.triggerDeploy(service.id);

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `📡 Deploy initiated (ID: ${deploy.id})`,
      });

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `⏳ Deploy status: ${deploy.status}`,
      });

      if (service.serviceDetails.url) {
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `🌐 Service URL: ${service.serviceDetails.url}`,
        });
      }

      // Mark as success (or live_deploying if we want to poll status)
      await ctx.runMutation(internal.deployments.updateStatus, {
        deploymentId: args.deploymentId,
        status: "success",
        log: `✅ Successfully deployed to Render!`,
      });

      // Store production URL if available
      if (service.serviceDetails.url) {
        await ctx.runMutation(internal.deployments.updateProductionUrl, {
          deploymentId: args.deploymentId,
          productionUrl: service.serviceDetails.url,
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      await ctx.runMutation(internal.deployments.updateStatus, {
        deploymentId: args.deploymentId,
        status: "failed",
        log: `❌ Deployment failed: ${errorMessage}`,
      });

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `Error details: ${errorMessage}`,
      });
    }
  },
});
