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
 * Detect the default branch of a GitHub repository
 * Tries to fetch from GitHub API, falls back to common branch names
 */
async function detectDefaultBranch(repoUrl: string): Promise<string> {
  try {
    // Extract owner/repo from GitHub URL
    // e.g. https://github.com/PulseDigitals/estate-management-system
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      console.log("[Branch Detection] Not a GitHub URL, defaulting to main");
      return "main";
    }
    
    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, "");
    
    console.log(`[Branch Detection] Fetching default branch for ${owner}/${cleanRepo}`);
    
    // Call GitHub API to get repository info
    const response = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`, {
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "1-Click-Deploy",
      },
    });
    
    if (response.ok) {
      const data = await response.json() as { default_branch?: string };
      if (data.default_branch) {
        console.log(`[Branch Detection] Found default branch: ${data.default_branch}`);
        return data.default_branch;
      }
    } else {
      console.log(`[Branch Detection] GitHub API failed with status ${response.status}`);
    }
  } catch (error) {
    console.error("[Branch Detection] Error fetching from GitHub:", error);
  }
  
  // Fallback to common branch names
  console.log("[Branch Detection] Falling back to 'main'");
  return "main";
}

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
        
        // Detect default branch from GitHub
        const defaultBranch = await detectDefaultBranch(project.gitRepoUrl);
        serviceInput.branch = defaultBranch;
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `🌿 Detected branch: ${defaultBranch}`,
        });
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
      console.error("[Render Deployment Error]", error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      console.error("[Render Deployment Error] Message:", errorMessage);
      if (errorStack) {
        console.error("[Render Deployment Error] Stack:", errorStack);
      }
      
      await ctx.runMutation(internal.deployments.updateStatus, {
        deploymentId: args.deploymentId,
        status: "failed",
        log: `❌ Deployment failed: ${errorMessage}`,
      });

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `🔍 Error details: ${errorMessage}`,
      });
      
      if (errorStack && errorStack.length < 500) {
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `📋 Stack trace: ${errorStack.substring(0, 500)}`,
        });
      }
    }
  },
});
