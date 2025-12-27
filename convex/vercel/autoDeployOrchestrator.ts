"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { api } from "../_generated/api";
import { v } from "convex/values";

/**
 * Orchestrates auto-deployment based on source type (ZIP or GitHub)
 * SECURITY: This is internal-only
 */
export const executeAutoDeployment = internalAction({
  args: {
    deploymentId: v.id("deployments"),
  },
  handler: async (ctx, args) => {
    try {
      // Get deployment details
      const deployment = await ctx.runQuery(internal.vercel.liveDeploymentHelpers.getDeploymentForLive, {
        deploymentId: args.deploymentId,
      });

      if (!deployment) {
        console.error("Deployment not found:", args.deploymentId);
        return;
      }

      // Get user's Vercel connection
      if (!deployment.userId) {
        throw new Error("Deployment has no associated user");
      }

      const vercelConnection = await ctx.runAction((api as any).vercelActions.getAccessTokenForUser, {
        userId: deployment.userId,
      });

      if (!vercelConnection || !vercelConnection.accessToken) {
        throw new Error("Vercel not connected");
      }

      // Get project details
      const project = await ctx.runQuery(internal.vercel.liveDeploymentHelpers.getProjectDetails, {
        projectId: deployment.projectId,
      });

      if (!project) {
        throw new Error("Project not found");
      }

      const projectName = project.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");

      // Route to appropriate deployment pathway
      if (deployment.deploymentSource === "zip" && deployment.sourceStorageId) {
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: "📦 Deploying from ZIP file...",
        });

        await ctx.runAction(internal.vercel.deployFromZip.deployFromZip, {
          deploymentId: args.deploymentId,
          storageId: deployment.sourceStorageId,
          projectName,
          accessToken: vercelConnection.accessToken,
          teamId: vercelConnection.teamId,
        });

      } else if (deployment.deploymentSource === "github" && deployment.sourceGitHubUrl) {
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: "🔗 Deploying from GitHub repository...",
        });

        await ctx.runAction(internal.vercel.deployFromGitHub.deployFromGitHub, {
          deploymentId: args.deploymentId,
          gitHubUrl: deployment.sourceGitHubUrl,
          projectName,
          accessToken: vercelConnection.accessToken,
          teamId: vercelConnection.teamId,
        });

      } else {
        throw new Error("Invalid deployment source or missing source data");
      }

    } catch (error) {
      console.error("Auto-deployment error:", error);
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
      await ctx.runMutation(internal.deployments.updateStatus, {
        deploymentId: args.deploymentId,
        status: "failed",
        log: "Auto-deployment failed",
      });
    }
  },
});
