import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
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
  }).index("by_projectId", ["projectId"]),

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
