import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

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

    const alertState = deployment.alerts || {
      warningSent: false,
      criticalSent: false,
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

    // Evaluate and dispatch alerts
    const newAlertState = { ...alertState };
    
    // Critical alert (35%+)
    if (percentIncrease >= 35 && !alertState.criticalSent) {
      await dispatchAlert(ctx, deploymentId, deployment.projectId, "critical", {
        percentIncrease,
        currentEstimate: Math.round(currentEstimate),
        baseline,
      });
      newAlertState.criticalSent = true;
      newAlertState.lastNotifiedAt = Date.now();
    }
    // Warning alert (20%+)
    else if (percentIncrease >= 20 && percentIncrease < 35 && !alertState.warningSent) {
      await dispatchAlert(ctx, deploymentId, deployment.projectId, "warning", {
        percentIncrease,
        currentEstimate: Math.round(currentEstimate),
        baseline,
      });
      newAlertState.warningSent = true;
      newAlertState.lastNotifiedAt = Date.now();
    }
    // Reset alerts if costs go back to normal
    else if (percentIncrease < 20) {
      newAlertState.warningSent = false;
      newAlertState.criticalSent = false;
    }

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
      alerts: newAlertState,
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

/**
 * Dispatch alert notifications (MVP: simulated)
 */
async function dispatchAlert(
  ctx: MutationCtx,
  deploymentId: Id<"deployments">,
  projectId: Id<"projects">,
  alertType: "warning" | "critical",
  payload: {
    percentIncrease: number;
    currentEstimate: number;
    baseline: number;
  }
): Promise<void> {
  const now = Date.now();

  // Generate alert message
  const message = generateAlertMessage(alertType, payload);

  // Simulate email alert
  console.log(`📧 [EMAIL ALERT - ${alertType.toUpperCase()}]`, message);
  await ctx.db.insert("alertHistory", {
    deploymentId,
    projectId,
    alertType,
    channel: "email",
    status: "sent",
    message,
    createdAt: now,
  });

  // Simulate Slack alert
  console.log(`💬 [SLACK ALERT - ${alertType.toUpperCase()}]`, message);
  await ctx.db.insert("alertHistory", {
    deploymentId,
    projectId,
    alertType,
    channel: "slack",
    status: "sent",
    message,
    createdAt: now,
  });
}

/**
 * Generate alert message
 */
function generateAlertMessage(
  alertType: "warning" | "critical",
  payload: { percentIncrease: number; currentEstimate: number; baseline: number }
): string {
  const { percentIncrease, currentEstimate, baseline } = payload;
  const icon = alertType === "critical" ? "🚨" : "⚠️";
  
  return `${icon} Cost Alert (${alertType.toUpperCase()})
Current cost: $${currentEstimate}/mo (+${Math.round(percentIncrease)}%)
Baseline: $${baseline}/mo
Status: ${alertType.toUpperCase()}

Recommended action:
• Review provider choice
• Consider cost optimization
• View deployment details for recommendations`;
}
