import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

type DriftStatus = "normal" | "warning" | "critical";

/**
 * Set cost baseline when deployment first succeeds
 */
export const setCostBaseline = internalMutation({
  args: {
    deploymentId: v.id("deployments"),
  },
  handler: async (ctx, { deploymentId }) => {
    const deployment = await ctx.db.get(deploymentId);
    if (!deployment || !deployment.estimatedCost) return;

    const baseline = deployment.estimatedCost.monthlyTotal;

    await ctx.db.patch(deploymentId, {
      costBaseline: baseline,
      costAlerts: {
        thresholdPercent: 20, // Default 20% threshold
        triggered: false,
        lastCheckedAt: Date.now(),
      },
      costDrift: {
        currentEstimate: baseline,
        percentIncrease: 0,
        status: "normal",
      },
    });
  },
});

/**
 * Check for cost drift and trigger alerts
 * In a real system, this would run periodically
 * For MVP, we simulate drift for demo purposes
 */
export const checkCostDrift = internalMutation({
  args: {
    deploymentId: v.id("deployments"),
    simulatedIncrease: v.optional(v.number()), // For demo: simulate cost increase
  },
  handler: async (ctx, { deploymentId, simulatedIncrease }) => {
    const deployment = await ctx.db.get(deploymentId);
    if (!deployment || !deployment.costBaseline || !deployment.estimatedCost) {
      return;
    }

    const baseline = deployment.costBaseline;
    const alerts = deployment.costAlerts || {
      thresholdPercent: 20,
      triggered: false,
      lastCheckedAt: Date.now(),
    };

    // Simulate cost increase for demo (in production, this would be actual usage data)
    // Use provided simulation or default to 0
    const increase = simulatedIncrease !== undefined ? simulatedIncrease : 0;
    const currentEstimate = baseline + baseline * (increase / 100);
    
    const percentIncrease = ((currentEstimate - baseline) / baseline) * 100;
    
    // Categorize drift
    const status = categorizeDrift(percentIncrease);
    
    // Check if alert should be triggered
    const triggered = percentIncrease >= alerts.thresholdPercent;

    await ctx.db.patch(deploymentId, {
      costDrift: {
        currentEstimate: Math.round(currentEstimate),
        percentIncrease: Math.round(percentIncrease * 10) / 10,
        status,
      },
      costAlerts: {
        ...alerts,
        triggered,
        lastCheckedAt: Date.now(),
      },
    });
  },
});

/**
 * Update alert threshold
 */
export const updateAlertThreshold = internalMutation({
  args: {
    deploymentId: v.id("deployments"),
    thresholdPercent: v.number(),
  },
  handler: async (ctx, { deploymentId, thresholdPercent }) => {
    const deployment = await ctx.db.get(deploymentId);
    if (!deployment || !deployment.costAlerts) return;

    await ctx.db.patch(deploymentId, {
      costAlerts: {
        ...deployment.costAlerts,
        thresholdPercent,
      },
    });
  },
});

/**
 * Categorize drift severity
 */
function categorizeDrift(percentIncrease: number): DriftStatus {
  if (percentIncrease < 15) return "normal";
  if (percentIncrease < 30) return "warning";
  return "critical";
}
