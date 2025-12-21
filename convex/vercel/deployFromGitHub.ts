"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { vercelClient } from "./client";

/**
 * Deploys a codebase from a GitHub repository to Vercel
 * SECURITY: This is internal-only
 */
export const deployFromGitHub = internalAction({
  args: {
    deploymentId: v.id("deployments"),
    gitHubUrl: v.string(),
    projectName: v.string(),
    accessToken: v.string(),
    teamId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: "🔗 Connecting GitHub repository to Vercel...",
      });

      // Parse GitHub URL to get owner and repo
      const urlMatch = args.gitHubUrl.match(/github\.com\/([^/]+)\/([^/?#]+)/);
      if (!urlMatch) {
        throw new Error("Invalid GitHub URL format");
      }

      const [, owner, repo] = urlMatch;
      const repoName = repo.replace(/\.git$/, "");

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `✓ Found repository: ${owner}/${repoName}`,
      });

      // Create Vercel project connected to GitHub
      const api = vercelClient(args.accessToken);
      const createEndpoint = args.teamId 
        ? `/v9/projects?teamId=${args.teamId}` 
        : "/v9/projects";

      const projectPayload = {
        name: args.projectName,
        framework: "vite",
        buildCommand: "npm run build",
        outputDirectory: "dist",
        installCommand: "npm install",
        gitRepository: {
          type: "github",
          repo: `${owner}/${repoName}`,
        },
      };

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: "Creating Vercel project...",
      });

      const projectRes = await api(createEndpoint, {
        method: "POST",
        body: JSON.stringify(projectPayload),
      });

      if (!projectRes.ok) {
        const error = await projectRes.text();
        throw new Error(`Failed to create Vercel project: ${error}`);
      }

      const projectData = await projectRes.json();

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `✓ Project created: ${projectData.name}`,
      });

      // Trigger initial deployment
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: "🚀 Triggering deployment...",
      });

      const deployEndpoint = args.teamId 
        ? `/v13/deployments?teamId=${args.teamId}` 
        : "/v13/deployments";

      const deployPayload = {
        name: args.projectName,
        gitSource: {
          type: "github",
          repo: `${owner}/${repoName}`,
          ref: "main", // or master, depending on repo
        },
        target: "production",
      };

      const deployRes = await api(deployEndpoint, {
        method: "POST",
        body: JSON.stringify(deployPayload),
      });

      if (!deployRes.ok) {
        const error = await deployRes.text();
        throw new Error(`Failed to trigger deployment: ${error}`);
      }

      const deployData = await deployRes.json();

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `✓ Deployment triggered: ${deployData.id}`,
      });

      // Update deployment record
      await ctx.runMutation(internal.vercel.liveDeploymentHelpers.updateVercelDeploymentId, {
        deploymentId: args.deploymentId,
        vercelDeploymentId: deployData.id,
        productionUrl: `https://${deployData.url}`,
      });

      await ctx.runMutation(internal.vercel.liveDeploymentHelpers.updateVercelProjectId, {
        deploymentId: args.deploymentId,
        vercelProjectId: projectData.id,
      });

      // Start polling for status
      await ctx.scheduler.runAfter(3000, internal.vercel.liveDeploymentPolling.pollVercelStatus, {
        deploymentId: args.deploymentId,
        vercelDeploymentId: deployData.id,
        accessToken: args.accessToken,
        teamId: args.teamId,
        pollCount: 0,
      });

    } catch (error) {
      console.error("Deploy from GitHub error:", error);
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
      await ctx.runMutation(internal.deployments.updateStatus, {
        deploymentId: args.deploymentId,
        status: "failed",
        log: "Deployment failed",
      });
    }
  },
});
