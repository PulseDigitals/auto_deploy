import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Internal query to fetch deployment data for AI analysis
export const getDeploymentDataQuery = internalQuery({
  args: {
    deploymentId: v.id("deployments"),
  },
  handler: async (ctx, { deploymentId }) => {
    const deployment = await ctx.db.get(deploymentId);
    
    if (!deployment) {
      return null;
    }

    // Return read-only data for AI analysis
    return {
      providerId: deployment.providerId,
      provider: deployment.provider,
      estimatedCost: deployment.estimatedCost,
      costComparison: deployment.costComparison,
      costDrift: deployment.costDrift,
      buildTime: deployment.buildTime,
      artifacts: deployment.artifacts,
    };
  },
});

// Internal mutation to save AI insights
export const saveAIInsights = internalMutation({
  args: {
    deploymentId: v.id("deployments"),
    insights: v.object({
      summary: v.string(),
      recommendation: v.string(),
      reasoning: v.array(v.string()),
      confidenceScore: v.number(),
      migrationNotes: v.array(v.string()),
      riskFactors: v.array(v.string()),
      generated: v.boolean(),
    }),
  },
  handler: async (ctx, { deploymentId, insights }) => {
    await ctx.db.patch(deploymentId, {
      aiInsights: insights,
    });
  },
});
