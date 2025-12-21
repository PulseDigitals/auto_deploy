import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

/**
 * Creates a new auto-deployment from either ZIP upload or GitHub repo
 */
export const createAutoDeployment = mutation({
  args: {
    projectName: v.string(),
    provider: v.string(), // "vercel" for now
    source: v.union(v.literal("zip"), v.literal("github")),
    sourceStorageId: v.optional(v.id("_storage")), // For ZIP uploads
    sourceGitHubUrl: v.optional(v.string()), // For GitHub repos
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Create or get project
    let project = await ctx.db
      .query("projects")
      .filter((q) => q.eq(q.field("name"), args.projectName))
      .first();

    if (!project) {
      const projectId = await ctx.db.insert("projects", {
        name: args.projectName,
        userId: user._id,
        createdAt: Date.now(),
        status: "new",
        gitRepoUrl: args.source === "github" ? args.sourceGitHubUrl : undefined,
      });
      project = await ctx.db.get(projectId);
    }

    if (!project) {
      throw new Error("Failed to create project");
    }

    // Create deployment record
    const deploymentId = await ctx.db.insert("deployments", {
      projectId: project._id,
      userId: user._id,
      provider: args.provider,
      providerId: "vercel",
      deploymentMode: "live",
      deploymentSource: args.source,
      sourceStorageId: args.sourceStorageId,
      sourceGitHubUrl: args.sourceGitHubUrl,
      status: "pending",
      createdAt: Date.now(),
      logs: ["🚀 Starting auto-deployment..."],
    });

    return deploymentId;
  },
});

/**
 * Lists all auto-deployments
 */
export const listAutoDeployments = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      return [];
    }

    const deployments = await ctx.db
      .query("deployments")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .order("desc")
      .take(50);

    return deployments;
  },
});

/**
 * Gets deployment details
 */
export const getDeploymentDetails = query({
  args: { deploymentId: v.id("deployments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.deploymentId);
  },
});
