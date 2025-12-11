import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const listDeploymentsByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    return await ctx.db
      .query("deployments")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .order("desc")
      .collect()
      .catch(async () => {
        // Fallback if index doesn't exist: simple full scan (OK for MVP)
        const all = await ctx.db.query("deployments").order("desc").collect();
        return all.filter((d) => d.projectId === projectId);
      });
  },
});

export const listAllDeployments = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("deployments").order("desc").collect();
  },
});

export const createDeployment = mutation({
  args: {
    projectId: v.id("projects"),
    provider: v.string(), // e.g. "Vercel", "Netlify", "Render"
  },
  handler: async (ctx, { projectId, provider }) => {
    const now = Date.now();
    const id = await ctx.db.insert("deployments", {
      projectId,
      provider,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      logs: [],
    });
    return id;
  },
});

export const updateDeploymentStatus = mutation({
  args: {
    deploymentId: v.id("deployments"),
    status: v.string(),
  },
  handler: async (ctx, { deploymentId, status }) => {
    await ctx.db.patch(deploymentId, { status });
  },
});

// Internal mutation for scheduler to update deployment status and logs
export const updateStatus = internalMutation({
  args: {
    deploymentId: v.id("deployments"),
    status: v.string(),
    log: v.optional(v.string()),
  },
  handler: async (ctx, { deploymentId, status, log }) => {
    const deployment = await ctx.db.get(deploymentId);
    if (!deployment) return;

    await ctx.db.patch(deploymentId, {
      status,
      updatedAt: Date.now(),
      logs: log
        ? [...(deployment.logs || []), log]
        : deployment.logs || [],
    });
  },
});
