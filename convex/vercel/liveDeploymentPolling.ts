"use node";

import { internalAction } from "../_generated/server.js";
import { internal } from "../_generated/api.js";
import { v } from "convex/values";

/**
 * Polls Vercel deployment status and updates our database
 * Runs every 5 seconds for up to 5 minutes
 */
export const pollVercelStatus = internalAction({
  args: {
    deploymentId: v.id("deployments"),
    vercelDeploymentId: v.string(),
    accessToken: v.string(),
    teamId: v.optional(v.string()),
    pollCount: v.number(),
  },
  handler: async (ctx, { deploymentId, vercelDeploymentId, accessToken, teamId, pollCount }) => {
    const MAX_POLLS = 60; // 5 minutes max (60 * 5 seconds)

    if (pollCount >= MAX_POLLS) {
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId,
        message: "⚠️ Deployment timeout - check Vercel dashboard for status",
      });
      await ctx.runMutation(internal.deployments.updateStatus, {
        deploymentId,
        status: "failed",
        log: "Deployment timed out after 5 minutes",
      });
      return;
    }

    try {
      // Poll Vercel API
      const status = await ctx.runAction(internal.vercel.pollStatus.pollDeploymentStatus, {
        deploymentId: vercelDeploymentId,
        accessToken,
        teamId,
      });

      // Map Vercel status to our status
      const mappedStatus = mapVercelReadyState(status.readyState);

      // Log status updates
      if (pollCount === 0) {
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId,
          message: `Deployment queued on Vercel`,
        });
      }

      if (status.readyState === "BUILDING" && pollCount % 6 === 0) {
        // Log building status every 30 seconds
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId,
          message: `Building... (${Math.floor(pollCount * 5 / 60)}m elapsed)`,
        });
      }

      // Update deployment status
      await ctx.runMutation(internal.deployments.updateStatus, {
        deploymentId,
        status: mappedStatus,
      });

      // Check if deployment is complete
      if (status.readyState === "READY") {
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId,
          message: `✓ Live deployment successful!`,
        });
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId,
          message: `🌐 Production URL: https://${status.url}`,
        });

        // Generate artifacts for successful deployment (using simulation data for now)
        await ctx.scheduler.runAfter(500, internal.deployments.generateArtifacts, {
          deploymentId,
        });

        // Run cost estimation pipeline
        await ctx.scheduler.runAfter(1000, internal.costEstimation.generateCostEstimate, {
          deploymentId,
        });

        await ctx.scheduler.runAfter(1500, internal.costOptimization.generateOptimizationAdvice, {
          deploymentId,
        });

        await ctx.scheduler.runAfter(2000, internal.costGuardrails.setCostBaseline, {
          deploymentId,
        });

        await ctx.scheduler.runAfter(2500, internal.deploymentIntelligence.generateDeploymentIntelligence, {
          deploymentId,
        });

        await ctx.scheduler.runAfter(3000, internal.aiInsights.generateAIInsights, {
          deploymentId,
        });

        return;
      }

      if (status.readyState === "ERROR" || status.readyState === "CANCELED") {
        const errorDetails = status.errorMessage 
          ? ` - ${status.errorMessage}${status.errorCode ? ` (${status.errorCode})` : ''}`
          : '';
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId,
          message: `❌ Deployment ${status.readyState.toLowerCase()} on Vercel${errorDetails}`,
        });
        
        // Log full error details for debugging
        if (status.errorMessage) {
          console.error("Vercel deployment error:", {
            deploymentId: vercelDeploymentId,
            errorMessage: status.errorMessage,
            errorCode: status.errorCode,
            readyState: status.readyState,
          });
        }
        
        await ctx.runMutation(internal.deployments.updateStatus, {
          deploymentId,
          status: "failed",
          log: `Deployment ${status.readyState.toLowerCase()}${errorDetails}`,
        });
        return;
      }

      // Continue polling
      await ctx.scheduler.runAfter(5000, internal.vercel.liveDeploymentPolling.pollVercelStatus, {
        deploymentId,
        vercelDeploymentId,
        accessToken,
        teamId,
        pollCount: pollCount + 1,
      });
    } catch (error) {
      console.error("Polling error:", error);
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId,
        message: `Error polling status: ${error instanceof Error ? error.message : "Unknown"}`,
      });

      // Retry polling on error (unless max polls reached)
      if (pollCount < MAX_POLLS) {
        await ctx.scheduler.runAfter(5000, internal.vercel.liveDeploymentPolling.pollVercelStatus, {
          deploymentId,
          vercelDeploymentId,
          accessToken,
          teamId,
          pollCount: pollCount + 1,
        });
      }
    }
  },
});

function mapVercelReadyState(readyState: string): string {
  switch (readyState) {
    case "QUEUED":
      return "pending";
    case "BUILDING":
      return "running";
    case "READY":
      return "success";
    case "ERROR":
    case "CANCELED":
      return "failed";
    default:
      return "pending";
  }
}
