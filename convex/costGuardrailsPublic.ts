import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * Public mutation to simulate cost drift (for demo purposes)
 * In production, this would be triggered by actual usage monitoring
 */
export const simulateCostDrift = mutation({
  args: {
    deploymentId: v.id("deployments"),
    percentIncrease: v.number(), // e.g. 10, 20, 35
  },
  handler: async (ctx, { deploymentId, percentIncrease }) => {
    await ctx.scheduler.runAfter(0, internal.costGuardrails.checkCostDrift, {
      deploymentId,
      simulatedIncrease: percentIncrease,
    });
  },
});

/**
 * Update alert threshold preference
 */
export const updateAlertThreshold = mutation({
  args: {
    deploymentId: v.id("deployments"),
    thresholdPercent: v.number(),
  },
  handler: async (ctx, { deploymentId, thresholdPercent }) => {
    await ctx.scheduler.runAfter(0, internal.costGuardrails.updateAlertThreshold, {
      deploymentId,
      thresholdPercent,
    });
  },
});
