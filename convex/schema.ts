import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    subscription: v.optional(
      v.object({
        plan: v.string(), // "free" | "pro" | "team" | "enterprise"
        activatedAt: v.number(),
      })
    ),
  }).index("by_token", ["tokenIdentifier"]),

  projects: defineTable({
    name: v.string(),
    gitRepoUrl: v.optional(v.string()),
    userId: v.optional(v.string()), // For backward compatibility
    createdAt: v.number(),
    status: v.optional(v.string()), // "new" | "analyzing" | "analyzed" | "error"
  }),

  deployments: defineTable({
    projectId: v.id("projects"),
    provider: v.string(), // Human-readable name e.g. "Vercel"
    providerId: v.optional(v.string()), // "vercel" | "netlify" | "render" | "railway" | "aws"
    targetEnvironment: v.optional(v.string()), // e.g. "production"
    url: v.optional(v.string()), // placeholder deployment URL
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
});
