"use node";

import { internalAction } from "../_generated/server.js";
import { internal } from "../_generated/api.js";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel.d.ts";

/**
 * Orchestrates a live Vercel deployment
 * SECURITY: Requires OAuth token from vercelConnections
 */
export const executeLiveDeployment = internalAction({
  args: {
    deploymentId: v.id("deployments"),
  },
  handler: async (ctx, { deploymentId }) => {
    // Get deployment details
    const deployment = await ctx.runQuery(internal.vercel.liveDeploymentHelpers.getDeploymentForLive, {
      deploymentId,
    });

    if (!deployment) {
      console.error("Deployment not found:", deploymentId);
      return;
    }

    // Verify it's a live deployment
    if (deployment.deploymentMode !== "live") {
      console.log("Not a live deployment, skipping Vercel API calls");
      return;
    }

    // Get project details to find the user
    const project = await ctx.runQuery(internal.vercel.liveDeploymentHelpers.getProjectDetails, {
      projectId: deployment.projectId,
    });

    if (!project) {
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId,
        message: "ERROR: Project not found",
      });
      await ctx.runMutation(internal.deployments.updateStatus, {
        deploymentId,
        status: "failed",
        log: "Live deployment failed: Project not found",
      });
      return;
    }

    // Get the user ID from the deployment (who initiated it)
    if (!deployment.userId) {
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId,
        message: "ERROR: Deployment has no associated user. Please try again.",
      });
      await ctx.runMutation(internal.deployments.updateStatus, {
        deploymentId,
        status: "failed",
        log: "Live deployment failed: No user associated with deployment",
      });
      return;
    }

    // Get Vercel OAuth token from vercelConnections table using deployment's userId
    const vercelConnection = await ctx.runMutation(internal.vercelConnections.getAccessTokenForUser, {
      userId: deployment.userId,
    });

    if (!vercelConnection || !vercelConnection.accessToken) {
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId,
        message: "ERROR: Vercel not connected. Go to Settings to connect your account.",
      });
      await ctx.runMutation(internal.deployments.updateStatus, {
        deploymentId,
        status: "failed",
        log: "Live deployment failed: Vercel not connected",
      });
      return;
    }

    // Use vercelConnection for the rest of the deployment
    const connection = {
      accessToken: vercelConnection.accessToken,
      teamId: vercelConnection.teamId,
      teamSlug: vercelConnection.teamSlug,
    };

    try {
      // Log start
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId,
        message: "🚀 Starting LIVE deployment to Vercel...",
      });

      // Step 1: Create or get Vercel project
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId,
        message: "Creating Vercel project...",
      });

      const project = await ctx.runQuery(internal.vercel.liveDeploymentHelpers.getProjectDetails, {
        projectId: deployment.projectId,
      });

      if (!project) {
        throw new Error("Project not found");
      }

      // Generate safe project name (lowercase, no spaces)
      const safeProjectName = project.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");

      const vercelProject = await ctx.runAction(internal.vercel.createProject.createVercelProject, {
        name: safeProjectName,
        accessToken: connection.accessToken,
        teamId: connection.teamId,
      });

      await ctx.runMutation(internal.vercel.liveDeploymentHelpers.updateVercelProjectId, {
        deploymentId,
        vercelProjectId: vercelProject.id,
      });

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId,
        message: `✓ Vercel project created: ${vercelProject.name}`,
      });

      // Step 2: Trigger deployment
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId,
        message: "Triggering deployment on Vercel...",
      });

      const vercelDeployment = await ctx.runAction(internal.vercel.deploy.triggerDeployment, {
        projectName: safeProjectName,
        accessToken: connection.accessToken,
        teamId: connection.teamId,
      });

      await ctx.runMutation(internal.vercel.liveDeploymentHelpers.updateVercelDeploymentId, {
        deploymentId,
        vercelDeploymentId: vercelDeployment.id,
        productionUrl: `https://${vercelDeployment.url}`,
      });

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId,
        message: `✓ Deployment triggered: ${vercelDeployment.id}`,
      });

      // Step 3: Start polling for status
      await ctx.scheduler.runAfter(2000, internal.vercel.liveDeploymentPolling.pollVercelStatus, {
        deploymentId,
        vercelDeploymentId: vercelDeployment.id,
        accessToken: connection.accessToken,
        teamId: connection.teamId,
        pollCount: 0,
      });
    } catch (error) {
      console.error("Live deployment error:", error);
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId,
        message: `ERROR: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
      await ctx.runMutation(internal.deployments.updateStatus, {
        deploymentId,
        status: "failed",
        log: "Live deployment failed due to error",
      });
    }
  },
});
