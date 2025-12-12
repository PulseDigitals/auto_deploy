import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

type ProviderId = "vercel" | "netlify" | "render" | "railway" | "aws";

interface ProviderProfile {
  name: string;
  bestFor: string[];
  strengths: string[];
  weaknesses: string[];
  scalingCapability: number; // 1-10
  lockInRisk: number; // 1-10 (higher = more lock-in)
  operationalComplexity: number; // 1-10 (higher = more complex)
  costEfficiencyBase: number; // 1-10
}

const PROVIDER_PROFILES: Record<ProviderId, ProviderProfile> = {
  vercel: {
    name: "Vercel",
    bestFor: ["frontend", "static sites", "JAMstack", "Next.js apps"],
    strengths: ["Edge network", "Zero config", "Instant deployments", "Great DX"],
    weaknesses: ["API-heavy workloads", "Persistent backends", "High bandwidth costs"],
    scalingCapability: 9,
    lockInRisk: 6,
    operationalComplexity: 2,
    costEfficiencyBase: 6,
  },
  netlify: {
    name: "Netlify",
    bestFor: ["static sites", "headless CMS", "serverless functions"],
    strengths: ["Simple setup", "Built-in CDN", "Good for content sites"],
    weaknesses: ["Limited backend flexibility", "Function cold starts"],
    scalingCapability: 7,
    lockInRisk: 5,
    operationalComplexity: 3,
    costEfficiencyBase: 7,
  },
  render: {
    name: "Render",
    bestFor: ["full-stack apps", "APIs", "databases", "Docker workloads"],
    strengths: ["Flexible infra", "Database support", "Fair pricing", "No vendor lock-in"],
    weaknesses: ["Slower cold starts", "Less edge optimization"],
    scalingCapability: 8,
    lockInRisk: 3,
    operationalComplexity: 5,
    costEfficiencyBase: 9,
  },
  railway: {
    name: "Railway",
    bestFor: ["rapid prototyping", "indie projects", "simple backends"],
    strengths: ["Developer friendly", "Quick setup", "Affordable"],
    weaknesses: ["Less enterprise features", "Smaller network"],
    scalingCapability: 6,
    lockInRisk: 4,
    operationalComplexity: 3,
    costEfficiencyBase: 8,
  },
  aws: {
    name: "AWS",
    bestFor: ["enterprise", "custom infrastructure", "complex architectures"],
    strengths: ["Maximum flexibility", "Every service imaginable", "Global scale"],
    weaknesses: ["Steep learning curve", "Complex billing", "Over-engineering risk"],
    scalingCapability: 10,
    lockInRisk: 8,
    operationalComplexity: 9,
    costEfficiencyBase: 5,
  },
};

/**
 * Generate AI Deployment Intelligence after successful deployment
 */
export const generateDeploymentIntelligence = internalMutation({
  args: {
    deploymentId: v.id("deployments"),
  },
  handler: async (ctx, { deploymentId }) => {
    const deployment = await ctx.db.get(deploymentId);
    if (!deployment || !deployment.estimatedCost || !deployment.providerId) {
      return;
    }

    const currentProviderId = deployment.providerId as ProviderId;
    const currentCost = deployment.estimatedCost.monthlyTotal;

    // Calculate suitability scores for all providers
    const suitabilityScores = calculateSuitabilityScores(
      currentProviderId,
      currentCost,
      deployment
    );

    // Find best provider
    const bestProvider = Object.entries(suitabilityScores).reduce((a, b) =>
      b[1] > a[1] ? b : a
    )[0] as ProviderId;

    // Generate recommendation
    const recommendation = generateRecommendation(
      currentProviderId,
      bestProvider,
      suitabilityScores
    );

    // Calculate confidence
    const confidenceScore = calculateConfidence(suitabilityScores, currentProviderId);

    // Assess risk
    const riskLevel = assessRisk(currentProviderId, currentCost, deployment);

    // Generate reasoning
    const reasoning = generateReasoning(
      currentProviderId,
      bestProvider,
      suitabilityScores,
      currentCost,
      recommendation
    );

    // Migration readiness
    const migrationReadiness = assessMigrationReadiness(currentProviderId, bestProvider);

    // Store intelligence
    await ctx.db.patch(deploymentId, {
      deploymentIntelligence: {
        recommendation,
        confidenceScore,
        riskLevel,
        recommendedProvider: PROVIDER_PROFILES[bestProvider].name,
        reasoning,
        suitabilityScores: {
          vercel: Math.round(suitabilityScores.vercel),
          netlify: Math.round(suitabilityScores.netlify),
          render: Math.round(suitabilityScores.render),
          railway: Math.round(suitabilityScores.railway),
          aws: Math.round(suitabilityScores.aws),
        },
        migrationReadiness,
      },
    });
  },
});

/**
 * Calculate suitability scores for all providers
 */
function calculateSuitabilityScores(
  currentProviderId: ProviderId,
  currentCost: number,
  deployment: {
    estimatedCost?: {
      compute: number;
      bandwidth: number;
      storage: number;
    };
    buildTime?: number;
  }
): Record<ProviderId, number> {
  const scores: Record<ProviderId, number> = {
    vercel: 0,
    netlify: 0,
    render: 0,
    railway: 0,
    aws: 0,
  };

  // Analyze workload characteristics
  const compute = deployment.estimatedCost?.compute || 0;
  const bandwidth = deployment.estimatedCost?.bandwidth || 0;
  const storage = deployment.estimatedCost?.storage || 0;

  const isFrontendHeavy = compute < 20 && bandwidth > compute;
  const isBackendHeavy = compute > 30;
  const isBandwidthHeavy = bandwidth > 15;

  for (const [providerId, profile] of Object.entries(PROVIDER_PROFILES)) {
    let score = profile.costEfficiencyBase * 10;

    // Frontend-heavy workload
    if (isFrontendHeavy) {
      if (providerId === "vercel" || providerId === "netlify") {
        score += 20;
      } else if (providerId === "render") {
        score += 10;
      }
    }

    // Backend-heavy workload
    if (isBackendHeavy) {
      if (providerId === "render") {
        score += 25;
      } else if (providerId === "railway") {
        score += 15;
      } else if (providerId === "vercel") {
        score -= 10;
      }
    }

    // Bandwidth-heavy
    if (isBandwidthHeavy) {
      if (providerId === "vercel") {
        score -= 15; // Vercel charges more for bandwidth
      } else if (providerId === "render") {
        score += 15;
      }
    }

    // Penalize high operational complexity
    score -= profile.operationalComplexity * 2;

    // Reward low lock-in risk
    score += (10 - profile.lockInRisk) * 1.5;

    // Normalize to 0-100
    scores[providerId as ProviderId] = Math.max(0, Math.min(100, score));
  }

  return scores;
}

/**
 * Generate recommendation based on scores
 */
function generateRecommendation(
  currentProviderId: ProviderId,
  bestProvider: ProviderId,
  scores: Record<ProviderId, number>
): "stay" | "switch" | "monitor" {
  const currentScore = scores[currentProviderId];
  const bestScore = scores[bestProvider];
  const scoreDiff = bestScore - currentScore;

  if (scoreDiff < 5) {
    return "stay"; // Marginal difference
  } else if (scoreDiff < 15) {
    return "monitor"; // Worth watching but not urgent
  } else {
    return "switch"; // Significant improvement available
  }
}

/**
 * Calculate confidence score
 */
function calculateConfidence(
  scores: Record<ProviderId, number>,
  currentProviderId: ProviderId
): number {
  const values = Object.values(scores);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min;

  // High confidence if there's clear separation
  if (range > 20) return 85 + Math.random() * 10;
  if (range > 10) return 70 + Math.random() * 10;
  return 55 + Math.random() * 10;
}

/**
 * Assess risk level
 */
function assessRisk(
  currentProviderId: ProviderId,
  currentCost: number,
  deployment: { estimatedCost?: { bandwidth: number } }
): "low" | "medium" | "high" {
  const profile = PROVIDER_PROFILES[currentProviderId];
  const bandwidth = deployment.estimatedCost?.bandwidth || 0;

  // High lock-in is risky
  if (profile.lockInRisk > 7) return "high";

  // High cost with wrong provider is risky
  if (currentCost > 40 && profile.costEfficiencyBase < 6) return "medium";

  // Bandwidth-heavy on Vercel is risky
  if (currentProviderId === "vercel" && bandwidth > 15) return "medium";

  return "low";
}

/**
 * Generate natural language reasoning
 */
function generateReasoning(
  currentProviderId: ProviderId,
  bestProvider: ProviderId,
  scores: Record<ProviderId, number>,
  currentCost: number,
  recommendation: string
): string[] {
  const currentProfile = PROVIDER_PROFILES[currentProviderId];
  const bestProfile = PROVIDER_PROFILES[bestProvider];
  const reasoning: string[] = [];

  if (recommendation === "stay") {
    reasoning.push(
      `Your current provider (${currentProfile.name}) is well-suited for your workload`
    );
    reasoning.push(`Cost efficiency is ${scores[currentProviderId]}% optimal`);
    reasoning.push("No immediate action needed");
  } else if (recommendation === "switch") {
    reasoning.push(
      `${bestProfile.name} scores ${Math.round(scores[bestProvider])}% vs ${currentProfile.name}'s ${Math.round(scores[currentProviderId])}%`
    );
    reasoning.push(
      `${bestProfile.name} is optimized for: ${bestProfile.bestFor.slice(0, 2).join(", ")}`
    );
    const costSavings = Math.round((currentCost * (scores[bestProvider] - scores[currentProviderId])) / 100);
    if (costSavings > 5) {
      reasoning.push(`Potential monthly savings: $${costSavings}`);
    }
    reasoning.push(`Lower operational complexity: ${bestProfile.operationalComplexity}/10 vs ${currentProfile.operationalComplexity}/10`);
  } else {
    // monitor
    reasoning.push(
      `${bestProfile.name} shows promise (${Math.round(scores[bestProvider])}% vs current ${Math.round(scores[currentProviderId])}%)`
    );
    reasoning.push("Monitor costs and performance over the next 30 days");
    reasoning.push("Consider switching if traffic patterns change");
  }

  return reasoning;
}

/**
 * Assess migration readiness
 */
function assessMigrationReadiness(
  fromProvider: ProviderId,
  toProvider: ProviderId
): {
  difficulty: "easy" | "medium" | "hard";
  estimatedTime: string;
  risks: string[];
} {
  const from = PROVIDER_PROFILES[fromProvider];
  const to = PROVIDER_PROFILES[toProvider];

  const complexityDiff = Math.abs(from.operationalComplexity - to.operationalComplexity);
  const lockInImpact = from.lockInRisk;

  let difficulty: "easy" | "medium" | "hard" = "easy";
  let estimatedTime = "2-4 hours";
  const risks: string[] = [];

  if (complexityDiff > 4 || lockInImpact > 6) {
    difficulty = "hard";
    estimatedTime = "1-2 days";
    risks.push("Significant configuration changes required");
    risks.push("Potential downtime during migration");
  } else if (complexityDiff > 2 || lockInImpact > 4) {
    difficulty = "medium";
    estimatedTime = "4-8 hours";
    risks.push("Some environment variables may need adjustment");
    risks.push("DNS changes required");
  } else {
    risks.push("Minimal configuration changes");
    risks.push("Standard deployment process");
  }

  if (fromProvider === "aws") {
    risks.push("Complex AWS-specific services may need refactoring");
  }

  if (toProvider === "aws") {
    risks.push("Learning curve for AWS services");
  }

  return { difficulty, estimatedTime, risks };
}
