import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listDeploymentsByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const allDeployments = await ctx.db.query("deployments").collect();
    return allDeployments
      .filter((d) => d.projectId === args.projectId)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const listAllDeployments = query({
  args: {},
  handler: async (ctx) => {
    // Get all deployments
    const allDeployments = await ctx.db
      .query("deployments")
      .order("desc")
      .collect();

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
