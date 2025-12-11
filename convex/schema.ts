import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"]),

  projects: defineTable({
    userId: v.string(),
    name: v.string(),
    gitRepoUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  deployments: defineTable({
    projectId: v.id("projects"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("success"),
      v.literal("failed")
    ),
    provider: v.string(),
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),

  domains: defineTable({
    projectId: v.id("projects"),
    domain: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("verifying"),
      v.literal("active"),
      v.literal("error")
    ),
  }).index("by_project", ["projectId"]),

  manifests: defineTable({
    projectId: v.id("projects"),
    manifestJson: v.string(),
  }).index("by_project", ["projectId"]),
});
