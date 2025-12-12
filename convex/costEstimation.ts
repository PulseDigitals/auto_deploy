import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Cost breakdown per provider (monthly estimates)
type CostBreakdown = {
  compute: number;
  bandwidth: number;
  storage: number;
  total: number;
};

const PROVIDER_COSTS: Record<string, CostBreakdown> = {
  vercel: {
    compute: 20,
    bandwidth: 10,
    storage: 5,
    total: 35,
  },
  netlify: {
    compute: 19,
    bandwidth: 9,
    storage: 5,
    total: 33,
  },
  render: {
    compute: 15,
    bandwidth: 7,
    storage: 4,
    total: 26,
  },
  railway: {
    compute: 18,
    bandwidth: 8,
    storage: 4,
    total: 30,
  },
  aws: {
    compute: 25,
    bandwidth: 12,
    storage: 8,
    total: 45,
  },
};

const DEFAULT_ASSUMPTIONS =
  "Estimated for small-to-medium production app with ~50K monthly users, ~3GB static assets, and ~5GB monthly bandwidth";

/**
 * Generate cost estimate for a deployment
 */
export const generateCostEstimate = internalMutation({
  args: {
    deploymentId: v.id("deployments"),
  },
  handler: async (ctx, { deploymentId }) => {
    const deployment = await ctx.db.get(deploymentId);
    if (!deployment) return;

    const providerId = deployment.providerId || "vercel";
    const costs = PROVIDER_COSTS[providerId] || PROVIDER_COSTS.vercel;

    // Generate cost comparison for all providers
    const costComparison = Object.keys(PROVIDER_COSTS)
      .map((id) => ({
        provider: id,
        monthlyCost: PROVIDER_COSTS[id].total,
      }))
      .sort((a, b) => a.monthlyCost - b.monthlyCost);

    await ctx.db.patch(deploymentId, {
      estimatedCost: {
        monthlyTotal: costs.total,
        compute: costs.compute,
        bandwidth: costs.bandwidth,
        storage: costs.storage,
        currency: "USD",
        assumptions: DEFAULT_ASSUMPTIONS,
      },
      costComparison,
    });
  },
});
