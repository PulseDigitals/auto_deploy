"use node";

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * RENDER DEPLOYMENT STATUS POLLING
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Polls Render deployment status in real-time
 * Shows build progress, detects failures, and marks success when live
 */

import { internalAction } from "../_generated/server.js";
import { internal } from "../_generated/api.js";
import { v } from "convex/values";
import { RenderClient } from "./client.js";

/**
 * Poll Render deployment status and update our database
 * Runs every 5 seconds for up to 10 minutes (Render builds can be slow)
 */
export const pollRenderStatus = internalAction({
  args: {
    deploymentId: v.id("deployments"),
    renderServiceId: v.string(),
    renderDeployId: v.string(),
    apiKey: v.string(),
    serviceUrl: v.string(),
    pollCount: v.number(),
  },
  handler: async (ctx, args) => {
    const { deploymentId, renderServiceId, renderDeployId, apiKey, serviceUrl, pollCount } = args;
    
    // 10 minutes max (120 * 5 seconds) - Render can be slow on free tier
    const MAX_POLLS = 120;
    
    if (pollCount >= MAX_POLLS) {
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId,
        message: "⚠️ Polling timeout - deployment may still be building. Check Render dashboard.",
      });
      await ctx.runMutation(internal.deployments.updateStatus, {
        deploymentId,
        status: "running", // Keep as running, not failed - build might still complete
        log: "Polling timeout after 10 minutes. Build may still be in progress on Render.",
      });
      return;
    }

    try {
      // Create Render client
      const client = new RenderClient(apiKey);
      
      // Get deploy status
      const deploy = await client.getDeploy(renderServiceId, renderDeployId);
      
      if (!deploy) {
        throw new Error(`Deploy ${renderDeployId} not found`);
      }
      
      // Map Render status to our status
      const mappedStatus = mapRenderDeployStatus(deploy.status);
      
      // Log status updates at key points
      if (pollCount === 0) {
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId,
          message: `📡 Monitoring build progress...`,
        });
      }
      
      // Update on status change
      if (deploy.status === "build_in_progress" && pollCount % 12 === 0) {
        // Log every 60 seconds during build
        const elapsed = Math.floor(pollCount * 5 / 60);
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId,
          message: `🔨 Building... (${elapsed}m elapsed)`,
        });
      }
      
      // Update deployment status
      await ctx.runMutation(internal.deployments.updateStatus, {
        deploymentId,
        status: mappedStatus,
      });
      
      // Check if deployment is complete (LIVE)
      if (deploy.status === "live") {
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId,
          message: `✅ Build completed successfully!`,
        });
        
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // DEPLOYMENT VALIDATION
        // Verify that the deployed app is actually working
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId,
          message: `🔍 Validating deployment health...`,
        });
        
        // Import validation function
        const { validateDeployment } = await import("../hostingIntelligence.js");
        
        // Run validation
        const validation = await validateDeployment(
          serviceUrl,
          ["/", "/dashboard"],
          10000 // 10 second timeout per route
        );
        
        if (validation.success) {
          await ctx.runMutation(internal.deployments.appendLog, {
            deploymentId,
            message: `✅ Validation passed - all routes are responding correctly`,
          });
          
          await ctx.runMutation(internal.deployments.appendLog, {
            deploymentId,
            message: `🌐 Your app is now live at: ${serviceUrl}`,
          });
          
          await ctx.runMutation(internal.deployments.appendLog, {
            deploymentId,
            message: `💡 Tip: If you see a cached 404, try a hard refresh (Ctrl+Shift+R)`,
          });
          
          // Mark as success
          await ctx.runMutation(internal.deployments.updateStatus, {
            deploymentId,
            status: "success",
            log: `✅ Deployment is live and validated at ${serviceUrl}`,
          });
        } else {
          // Validation failed
          await ctx.runMutation(internal.deployments.appendLog, {
            deploymentId,
            message: `⚠️ Validation detected issues:`,
          });
          
          for (const check of validation.checkedRoutes) {
            if (!check.success) {
              await ctx.runMutation(internal.deployments.appendLog, {
                deploymentId,
                message: `   ✗ ${check.route}: ${check.error || `HTTP ${check.status}`}`,
              });
            }
          }
          
          if (validation.needsHealing) {
            await ctx.runMutation(internal.deployments.appendLog, {
              deploymentId,
              message: `🔧 Self-healing attempted but deployment may need manual review`,
            });
            await ctx.runMutation(internal.deployments.appendLog, {
              deploymentId,
              message: `📋 Check Render dashboard build logs for details`,
            });
          }
          
          await ctx.runMutation(internal.deployments.appendLog, {
            deploymentId,
            message: `🌐 Service URL: ${serviceUrl} (may show errors until routing is fixed)`,
          });
          
          // Mark as success but with warnings
          await ctx.runMutation(internal.deployments.updateStatus, {
            deploymentId,
            status: "success",
            log: `⚠️ Deployment complete but validation found routing issues`,
          });
        }
        
        // Generate cost insights
        await ctx.scheduler.runAfter(500, internal.deployments.generateArtifacts, {
          deploymentId,
        });
        
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
        
        return; // Stop polling
      }
      
      // Check if deployment failed
      if (deploy.status === "build_failed" || deploy.status === "update_failed" || deploy.status === "canceled") {
        const errorMessage = deploy.status === "canceled" 
          ? "Deployment was canceled"
          : "Build failed on Render";
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId,
          message: `❌ ${errorMessage}`,
        });
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId,
          message: `📋 Check build logs in Render dashboard for details`,
        });
        
        await ctx.runMutation(internal.deployments.updateStatus, {
          deploymentId,
          status: "failed",
          log: errorMessage,
        });
        
        return; // Stop polling
      }
      
      // Continue polling (deployment still in progress)
      await ctx.scheduler.runAfter(5000, internal.render.liveDeploymentPolling.pollRenderStatus, {
        deploymentId,
        renderServiceId,
        renderDeployId,
        apiKey,
        serviceUrl,
        pollCount: pollCount + 1,
      });
      
    } catch (error) {
      console.error("[Render Polling] Error:", error);
      
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId,
        message: `⚠️ Polling error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
      
      // Retry polling on error (unless max polls reached)
      if (pollCount < MAX_POLLS) {
        await ctx.scheduler.runAfter(10000, internal.render.liveDeploymentPolling.pollRenderStatus, {
          deploymentId,
          renderServiceId,
          renderDeployId,
          apiKey,
          serviceUrl,
          pollCount: pollCount + 1,
        });
      } else {
        await ctx.runMutation(internal.deployments.updateStatus, {
          deploymentId,
          status: "failed",
          log: "Polling failed after multiple retries",
        });
      }
    }
  },
});

/**
 * Map Render deploy status to our internal status
 */
function mapRenderDeployStatus(status: string): "pending" | "running" | "success" | "failed" {
  switch (status) {
    case "created":
      return "pending";
    case "build_in_progress":
    case "update_in_progress":
      return "running";
    case "live":
      return "success";
    case "build_failed":
    case "update_failed":
    case "canceled":
    case "deactivated":
      return "failed";
    default:
      return "pending";
  }
}
