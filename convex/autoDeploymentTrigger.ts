import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * Triggers an auto-deployment and schedules the orchestrator
 */
export const triggerAutoDeployment = mutation({
  args: {
    deploymentId: v.id("deployments"),
  },
  handler: async (ctx, args) => {
    // Update status to running
    await ctx.db.patch(args.deploymentId, {
      status: "running",
      updatedAt: Date.now(),
    });

    // Schedule the orchestrator
    await ctx.scheduler.runAfter(0, internal.vercel.autoDeployOrchestrator.executeAutoDeployment, {
      deploymentId: args.deploymentId,
    });

    return { success: true };
  },
});
