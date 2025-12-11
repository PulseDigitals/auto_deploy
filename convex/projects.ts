import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listProjectsByUser = query({
  args: {},
  handler: async (ctx) => {
    // For now, no per-user filtering in MVP.
    return await ctx.db.query("projects").order("desc").collect();
  },
});

export const getProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    return await ctx.db.get(projectId);
  },
});

// Internal helper used by actions
export const getProjectInternal = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    return await ctx.db.get(projectId);
  },
});

export const createProject = mutation({
  args: {
    name: v.string(),
    gitRepoUrl: v.optional(v.string()),
  },
  handler: async (ctx, { name, gitRepoUrl }) => {
    const now = Date.now();
    const id = await ctx.db.insert("projects", {
      name,
      gitRepoUrl: gitRepoUrl ?? undefined,
      createdAt: now,
      status: "new",
    });
    return id;
  },
});

export const updateProjectStatus = mutation({
  args: { projectId: v.id("projects"), status: v.string() },
  handler: async (ctx, { projectId, status }) => {
    await ctx.db.patch(projectId, { status });
  },
});
