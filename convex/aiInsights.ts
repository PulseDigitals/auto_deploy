"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import OpenAI from "openai";

// AI Insights Output Schema
interface AIInsightsOutput {
  summary: string;
  recommendation: string;
  reasoning: string[];
  confidenceScore: number;
  migrationNotes: string[];
  riskFactors: string[];
}

// Fallback deterministic insights when AI fails
function getFallbackInsights(providerId: string, costData: unknown): AIInsightsOutput {
  return {
    summary: `Deployment to ${providerId} is configured. Review cost estimates and provider comparison for optimization opportunities.`,
    recommendation: "Monitor deployment performance and cost over the next billing cycle before making provider changes.",
    reasoning: [
      "Current provider configuration meets baseline requirements",
      "Cost estimates are within typical ranges for this deployment type",
      "Monitor actual usage patterns before optimization",
    ],
    confidenceScore: 60,
    migrationNotes: [
      "Establish baseline metrics before considering migration",
      "Document current configuration for comparison",
    ],
    riskFactors: [
      "Limited historical data for optimization recommendations",
      "Provider-specific features may affect portability",
    ],
  };
}

// Generate AI insights for a deployment
export const generateAIInsights = internalAction({
  args: {
    deploymentId: v.id("deployments"),
  },
  handler: async (ctx, { deploymentId }) => {
    // Fetch deployment data (read-only)
    const deployment = await ctx.runQuery(internal.aiInsightsHelpers.getDeploymentDataQuery, {
      deploymentId,
    });

    if (!deployment) {
      console.error("Deployment not found:", deploymentId);
      return;
    }

    // Check if OpenAI API key is configured
    const apiKey = process.env.OPENAI_API_KEY;
    
    let insights: AIInsightsOutput;
    let generated = false;

    if (!apiKey) {
      console.warn("OpenAI API key not configured. Using fallback insights.");
      insights = getFallbackInsights(
        deployment.providerId || "unknown",
        deployment.estimatedCost
      );
    } else {
      try {
        // Initialize OpenAI client
        const openai = new OpenAI({ apiKey });

        // Build prompt with read-only data
        const prompt = buildAIPrompt(deployment);

        // Call OpenAI with strict timeout and token limits
        const response = await Promise.race([
          openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are an AI deployment advisor. Your role is ADVISORY ONLY.

CRITICAL RULES:
- You MUST NOT generate prices, costs, or numeric rankings
- You MUST NOT override deterministic outputs
- You provide qualitative insights and reasoning only
- If data is missing, acknowledge limitations

Output MUST be valid JSON matching this schema:
{
  "summary": "Brief deployment overview (1-2 sentences)",
  "recommendation": "High-level advisory recommendation",
  "reasoning": ["Bullet 1", "Bullet 2", "Bullet 3"],
  "confidenceScore": 0-100,
  "migrationNotes": ["Note 1", "Note 2"],
  "riskFactors": ["Risk 1", "Risk 2"]
}`,
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 800,
            response_format: { type: "json_object" },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("OpenAI timeout")), 15000)
          ),
        ]);

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error("Empty response from OpenAI");
        }

        // Parse and validate
        const parsed = JSON.parse(content) as AIInsightsOutput;
        
        // Validate schema
        if (
          typeof parsed.summary !== "string" ||
          typeof parsed.recommendation !== "string" ||
          !Array.isArray(parsed.reasoning) ||
          typeof parsed.confidenceScore !== "number" ||
          !Array.isArray(parsed.migrationNotes) ||
          !Array.isArray(parsed.riskFactors)
        ) {
          throw new Error("Invalid AI response schema");
        }

        // Clamp confidence score
        parsed.confidenceScore = Math.max(0, Math.min(100, parsed.confidenceScore));

        insights = parsed;
        generated = true;

        console.log("AI insights generated successfully for", deploymentId);
      } catch (error) {
        console.error("AI generation failed:", error);
        insights = getFallbackInsights(
          deployment.providerId || "unknown",
          deployment.estimatedCost
        );
      }
    }

    // Save insights to database
    await ctx.runMutation(internal.aiInsightsHelpers.saveAIInsights, {
      deploymentId,
      insights: {
        ...insights,
        generated,
      },
    });
  },
});

// Helper to build AI prompt from deployment data
function buildAIPrompt(deployment: {
  providerId?: string;
  provider?: string;
  estimatedCost?: {
    monthlyTotal: number;
    compute: number;
    bandwidth: number;
    storage: number;
    assumptions: string;
  };
  costComparison?: Array<{ provider: string; monthlyCost: number }>;
  costDrift?: {
    status: string;
    percentIncrease: number;
  };
  buildTime?: number;
  artifacts?: unknown[];
}): string {
  const provider = deployment.provider || deployment.providerId || "unknown";
  const cost = deployment.estimatedCost?.monthlyTotal || 0;
  const driftStatus = deployment.costDrift?.status || "normal";
  const driftPercent = deployment.costDrift?.percentIncrease || 0;

  // Build comparison table
  let comparisonText = "No comparison data available.";
  if (deployment.costComparison && deployment.costComparison.length > 0) {
    comparisonText = deployment.costComparison
      .map((c) => `${c.provider}: $${c.monthlyCost}/mo`)
      .join(", ");
  }

  return `Analyze this deployment configuration and provide advisory insights.

DEPLOYMENT DATA (READ-ONLY):
- Selected Provider: ${provider}
- Estimated Monthly Cost: $${cost}
- Cost Drift Status: ${driftStatus} (${driftPercent > 0 ? `+${driftPercent}%` : "baseline"})
- Build Time: ${deployment.buildTime || "N/A"}s
- Artifacts: ${deployment.artifacts?.length || 0} files
- Cost Comparison: ${comparisonText}

ADVISORY TASK:
Provide qualitative insights about this deployment. Focus on:
1. Overall deployment health and configuration
2. When to consider provider changes (qualitative only - DO NOT recalculate costs)
3. Migration complexity factors
4. Risk factors to monitor

Remember:
- DO NOT generate new cost estimates
- DO NOT override existing recommendations
- Acknowledge data limitations if present
- Keep confidence score realistic (60-85 typical)

Respond ONLY with valid JSON.`;
}

// Need to create these in a separate V8 file since we can't mix runtimes
// This is just the imports - actual implementations will be in aiInsightsHelpers.ts
