import { mutation, query } from "./_generated/server";
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

/**
 * Get alert history for a deployment
 */
export const getAlertHistory = query({
  args: {
    deploymentId: v.id("deployments"),
  },
  handler: async (ctx, { deploymentId }) => {
    return await ctx.db
      .query("alertHistory")
      .withIndex("by_deployment", (q) => q.eq("deploymentId", deploymentId))
      .order("desc")
      .collect();
  },
});
