import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    isPowerUser: v.optional(v.boolean()), // Power users can access advanced features
    isAdmin: v.optional(v.boolean()), // Admin users can access system projects
    adminBootstrapped: v.optional(v.boolean()), // Tracks if this user bootstrapped as first admin
    subscription: v.optional(
      v.object({
        plan: v.string(), // "free" | "pro" | "team" | "enterprise"
        activatedAt: v.number(),
      })
    ),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_isAdmin", ["isAdmin"]),

  projects: defineTable({
    name: v.string(),
    gitRepoUrl: v.optional(v.string()),
    userId: v.optional(v.string()), // For backward compatibility
    createdAt: v.number(),
    status: v.optional(v.string()), // "new" | "analyzing" | "analyzed" | "error"
    isSystemProject: v.optional(v.boolean()), // System projects are special
    visibility: v.optional(v.union(v.literal("user"), v.literal("system"))), // "user" | "system"
    createdByRole: v.optional(v.union(v.literal("user"), v.literal("admin"))), // "user" | "admin"
    providerPreference: v.optional(v.string()), // Preferred provider for system project
    environment: v.optional(v.string()), // Target environment for system project
    description: v.optional(v.string()), // Description for system project
    currentVersion: v.optional(v.string()), // e.g. "v1.3.2"
    latestAvailableVersion: v.optional(v.string()), // e.g. "v1.4.0"
    repositoryUrl: v.optional(v.string()), // GitHub URL (read-only for now)
    autoDeployEnabled: v.optional(v.boolean()), // default false
    lastSelfDeployAt: v.optional(v.number()), // timestamp of last self-deployment
    autoDeployOnRelease: v.optional(v.boolean()), // default false - auto-deploy when new release detected
    releaseChannel: v.optional(v.union(v.literal("stable"), v.literal("beta"))), // default "stable"
    releaseSource: v.optional(v.union(v.literal("manual"), v.literal("github"))), // default "manual"
    lastReleaseCheckAt: v.optional(v.number()), // timestamp of last release check
    lastReleaseDetectedAt: v.optional(v.number()), // timestamp of last detected release
    lastDetectedReleaseVersion: v.optional(v.string()), // last detected release version
    releaseNotes: v.optional(v.string()), // short text, optional
  }).index("by_isSystemProject", ["isSystemProject"]),

  deployments: defineTable({
    projectId: v.id("projects"),
    provider: v.string(), // Human-readable name e.g. "Vercel"
    providerId: v.optional(v.string()), // "vercel" | "netlify" | "render" | "railway" | "aws"
    deploymentMode: v.optional(v.union(v.literal("simulation"), v.literal("live"))), // "simulation" | "live" (optional for backward compatibility)
    targetEnvironment: v.optional(v.string()), // e.g. "production"
    url: v.optional(v.string()), // placeholder deployment URL
    productionUrl: v.optional(v.string()), // Real production URL from provider (for live deployments)
    vercelProjectId: v.optional(v.string()), // Real Vercel project ID (for live deployments)
    vercelDeploymentId: v.optional(v.string()), // Real Vercel deployment ID (for live deployments)
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    status: v.string(), // "pending" | "running" | "success" | "failed"
    logs: v.optional(v.array(v.string())),
    artifacts: v.optional(
      v.array(
        v.object({
          path: v.string(),
          type: v.string(), // "file" | "folder"
          content: v.optional(v.string()),
          size: v.optional(v.number()),
        })
      )
    ),
    buildTime: v.optional(v.number()), // in seconds
    previewUrl: v.optional(v.string()),
    estimatedCost: v.optional(
      v.object({
        monthlyTotal: v.number(),
        compute: v.number(),
        bandwidth: v.number(),
        storage: v.number(),
        currency: v.string(), // "USD"
        assumptions: v.string(),
      })
    ),
    costComparison: v.optional(
      v.array(
        v.object({
          provider: v.string(),
          monthlyCost: v.number(),
        })
      )
    ),
    costAdvisor: v.optional(
      v.object({
        recommendation: v.string(), // "Switch Provider" | "Stay on Current Provider" | "Optimize Configuration"
        recommendedProvider: v.string(),
        monthlySavings: v.number(),
        reasoning: v.array(v.string()),
        confidenceScore: v.number(), // 0-100
      })
    ),
    costBaseline: v.optional(v.number()), // baseline monthly estimate at deploy time
    costAlerts: v.optional(
      v.object({
        thresholdPercent: v.number(), // e.g. 20
        triggered: v.boolean(),
        lastCheckedAt: v.number(),
      })
    ),
    costDrift: v.optional(
      v.object({
        currentEstimate: v.number(),
        percentIncrease: v.number(),
        status: v.string(), // "normal" | "warning" | "critical"
      })
    ),
    alerts: v.optional(
      v.object({
        warningSent: v.boolean(),
        criticalSent: v.boolean(),
        lastNotifiedAt: v.optional(v.number()),
      })
    ),
    deploymentIntelligence: v.optional(
      v.object({
        recommendation: v.string(), // "stay" | "switch" | "monitor"
        confidenceScore: v.number(), // 0-100
        riskLevel: v.string(), // "low" | "medium" | "high"
        recommendedProvider: v.string(),
        reasoning: v.array(v.string()),
        suitabilityScores: v.object({
          vercel: v.number(),
          netlify: v.number(),
          render: v.number(),
          railway: v.number(),
          aws: v.number(),
        }),
        migrationReadiness: v.object({
          difficulty: v.string(), // "easy" | "medium" | "hard"
          estimatedTime: v.string(),
          risks: v.array(v.string()),
        }),
      })
    ),
    aiInsights: v.optional(
      v.object({
        summary: v.string(),
        recommendation: v.string(),
        reasoning: v.array(v.string()),
        confidenceScore: v.number(), // 0-100
        migrationNotes: v.array(v.string()),
        riskFactors: v.array(v.string()),
        generated: v.boolean(), // true if real AI, false if fallback
      })
    ),
    platformVersion: v.optional(v.string()), // version deployed during this run
    isSelfDeployment: v.optional(v.boolean()), // true if this is a self-deployment
  }).index("by_projectId", ["projectId"]),

  alertHistory: defineTable({
    deploymentId: v.id("deployments"),
    projectId: v.id("projects"),
    alertType: v.string(), // "warning" | "critical"
    channel: v.string(), // "email" | "slack"
    status: v.string(), // "sent" | "failed" | "blocked"
    message: v.string(),
    blockedReason: v.optional(v.string()), // "upgrade_required" | null
    createdAt: v.number(),
  }).index("by_deployment", ["deploymentId"]),

  platformReleases: defineTable({
    version: v.string(),
    channel: v.union(v.literal("stable"), v.literal("beta")),
    source: v.union(v.literal("manual"), v.literal("github")),
    notes: v.optional(v.string()),
    detectedAt: v.number(),
    detectedByUserId: v.optional(v.id("users")),
    status: v.string(), // "detected" | "queued" | "deployed" | "skipped" | "failed"
    deploymentId: v.optional(v.id("deployments")),
  })
    .index("by_version", ["version"])
    .index("by_detectedAt", ["detectedAt"])
    .index("by_status", ["status"]),

  domains: defineTable({
    projectId: v.id("projects"),
    domain: v.string(),
    status: v.string(), // "pending" | "verifying" | "active" | "error"
    createdAt: v.number(),
  }),

  manifests: defineTable({
    projectId: v.id("projects"),
    manifest: v.any(),
    createdAt: v.number(),
  }),

  providerConnections: defineTable({
    userId: v.id("users"),
    provider: v.string(), // "vercel" | "netlify" | "render" | "railway" | "aws"
    accessToken: v.string(), // Encrypted access token
    refreshToken: v.optional(v.string()), // Optional refresh token
    scopes: v.array(v.string()), // Granted OAuth scopes
    accountName: v.optional(v.string()), // Provider account name
    accountEmail: v.optional(v.string()), // Provider account email
    teamId: v.optional(v.string()), // Team ID (if applicable)
    teamName: v.optional(v.string()), // Team name (if applicable)
    connectedAt: v.number(), // Timestamp when connected
    lastValidatedAt: v.number(), // Last time token was validated
  }).index("by_user_and_provider", ["userId", "provider"]),
});
