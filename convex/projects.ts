import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

export const listProjectsByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
    return projects;
  },
});

export const getProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new ConvexError({
        message: "Project not found",
        code: "NOT_FOUND",
      });
    }
    return project;
  },
});

export const createProject = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    gitRepoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const projectId = await ctx.db.insert("projects", {
      userId: args.userId,
      name: args.name,
      gitRepoUrl: args.gitRepoUrl,
      createdAt: Date.now(),
    });
    return projectId;
  },
});

export const deleteProject = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.projectId);
  },
});
