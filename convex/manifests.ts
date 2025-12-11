import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const createManifest = mutation({
  args: {
    projectId: v.id("projects"),
    manifest: v.any(),
  },
  handler: async (ctx, { projectId, manifest }) => {
    await ctx.db.insert("manifests", {
      projectId,
      manifest,
      createdAt: Date.now(),
    });
  },
});

export const getManifestByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const all = await ctx.db.query("manifests").collect();
    return all.find(m => m.projectId === projectId) ?? null;
  },
});
