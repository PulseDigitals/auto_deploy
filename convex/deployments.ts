import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listDeploymentsByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const deployments = await ctx.db
      .query("deployments")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();
    return deployments;
  },
});

export const listAllDeployments = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Get all projects for this user
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const projectIds = projects.map((p) => p._id);

    // Get all deployments for these projects
    const allDeployments = [];
    for (const projectId of projectIds) {
      const deployments = await ctx.db
        .query("deployments")
        .withIndex("by_project", (q) => q.eq("projectId", projectId))
        .collect();
      allDeployments.push(...deployments);
    }

    // Sort by creation time descending
    allDeployments.sort((a, b) => b.createdAt - a.createdAt);

    return allDeployments;
  },
});

export const createDeployment = mutation({
  args: {
    projectId: v.id("projects"),
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    const deploymentId = await ctx.db.insert("deployments", {
      projectId: args.projectId,
      status: "pending",
      provider: args.provider,
      createdAt: Date.now(),
    });
    return deploymentId;
  },
});

export const updateDeploymentStatus = mutation({
  args: {
    deploymentId: v.id("deployments"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("success"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.deploymentId, {
      status: args.status,
    });
  },
});
