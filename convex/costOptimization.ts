import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

type CostComparison = {
  provider: string;
  monthlyCost: number;
};

type CostAdvisorResult = {
  recommendation: string;
  recommendedProvider: string;
  monthlySavings: number;
  reasoning: string[];
  confidenceScore: number;
};

// Provider characteristics for workload matching
const PROVIDER_PROFILES = {
  vercel: {
    strengths: ["static sites", "Next.js", "frontend frameworks", "global edge"],
    workloadTypes: ["frontend-heavy", "static"],
  },
  netlify: {
    strengths: ["jamstack", "static sites", "serverless functions", "forms"],
    workloadTypes: ["frontend-heavy", "static"],
  },
  render: {
    strengths: ["full-stack apps", "databases", "backend services", "cost efficiency"],
    workloadTypes: ["backend-heavy", "full-stack"],
  },
  railway: {
    strengths: ["indie projects", "rapid prototyping", "simple deployment", "databases"],
    workloadTypes: ["full-stack", "indie"],
  },
  aws: {
    strengths: ["enterprise scale", "advanced services", "global reach", "compliance"],
    workloadTypes: ["enterprise", "complex"],
  },
};

/**
 * Generate cost optimization recommendations
 */
export const generateOptimizationAdvice = internalMutation({
  args: {
    deploymentId: v.id("deployments"),
  },
  handler: async (ctx, { deploymentId }): Promise<void> => {
    const deployment = await ctx.db.get(deploymentId);
    if (!deployment || !deployment.estimatedCost || !deployment.costComparison) {
      return;
    }

    const currentProviderId = deployment.providerId || "vercel";
    const currentCost = deployment.estimatedCost.monthlyTotal;
    const costComparison = deployment.costComparison;

    // Find cheapest provider
    const cheapest = costComparison[0]; // Already sorted by cost in costEstimation
    const savings = currentCost - cheapest.monthlyCost;

    // Generate recommendation
    const advisor = generateRecommendation(
      currentProviderId,
      currentCost,
      cheapest,
      savings,
      costComparison
    );

    await ctx.db.patch(deploymentId, {
      costAdvisor: advisor,
    });
  },
});

function generateRecommendation(
  currentProviderId: string,
  currentCost: number,
  cheapest: CostComparison,
  savings: number,
  allProviders: CostComparison[]
): CostAdvisorResult {
  const SAVINGS_THRESHOLD = 5; // Recommend switching if savings >= $5/month

  // Case 1: Current provider is already cheapest or close enough
  if (savings < SAVINGS_THRESHOLD) {
    return {
      recommendation: "Stay on Current Provider",
      recommendedProvider: currentProviderId,
      monthlySavings: 0,
      reasoning: [
        `Your current provider offers competitive pricing for this workload`,
        `Switching would save less than $${SAVINGS_THRESHOLD}/month`,
        `The cost difference doesn't justify migration effort`,
      ],
      confidenceScore: 90,
    };
  }

  // Case 2: Significant savings available
  const cheapestProfile = PROVIDER_PROFILES[cheapest.provider as keyof typeof PROVIDER_PROFILES];
  const currentProfile = PROVIDER_PROFILES[currentProviderId as keyof typeof PROVIDER_PROFILES];

  const reasoning: string[] = [];

  // Add cost-based reasoning
  reasoning.push(
    `${capitalizeProvider(cheapest.provider)} costs $${cheapest.monthlyCost}/month vs $${currentCost}/month`
  );
  reasoning.push(`You could save $${savings}/month or $${savings * 12}/year`);

  // Add workload-based reasoning
  if (cheapestProfile) {
    if (cheapestProfile.strengths.length > 0) {
      reasoning.push(
        `${capitalizeProvider(cheapest.provider)} excels at ${cheapestProfile.strengths.slice(0, 2).join(" and ")}`
      );
    }
  }

  // Add migration ease reasoning
  if (currentCost > 40) {
    reasoning.push(`For enterprise workloads, evaluate compliance requirements before switching`);
  } else {
    reasoning.push(`Migration is straightforward for standard web applications`);
  }

  // Calculate confidence score
  let confidence = 75; // Base confidence
  if (savings >= 10) confidence += 10;
  if (savings >= 15) confidence += 5;
  confidence = Math.min(confidence, 95);

  return {
    recommendation: "Switch Provider",
    recommendedProvider: cheapest.provider,
    monthlySavings: Math.round(savings),
    reasoning,
    confidenceScore: confidence,
  };
}

function capitalizeProvider(provider: string): string {
  const names: Record<string, string> = {
    vercel: "Vercel",
    netlify: "Netlify",
    render: "Render",
    railway: "Railway",
    aws: "AWS",
  };
  return names[provider] || provider;
}
