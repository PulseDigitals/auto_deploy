import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getManifestByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const manifest = await ctx.db
      .query("manifests")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .first();
    return manifest;
  },
});

export const createManifest = internalMutation({
  args: {
    projectId: v.id("projects"),
    manifest: v.object({
      framework: v.string(),
      frontend: v.boolean(),
      backend: v.boolean(),
      buildCommand: v.string(),
      startCommand: v.string(),
      envVars: v.array(v.string()),
      recommendedProvider: v.string(),
      notes: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const manifestId = await ctx.db.insert("manifests", {
      projectId: args.projectId,
      framework: args.manifest.framework,
      frontend: args.manifest.frontend,
      backend: args.manifest.backend,
      buildCommand: args.manifest.buildCommand,
      startCommand: args.manifest.startCommand,
      envVars: args.manifest.envVars,
      recommendedProvider: args.manifest.recommendedProvider,
      notes: args.manifest.notes,
      createdAt: Date.now(),
    });
    return manifestId;
  },
});
