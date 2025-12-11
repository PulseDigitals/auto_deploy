import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listDomainsByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const allDomains = await ctx.db.query("domains").collect();
    return allDomains.filter((d) => d.projectId === args.projectId);
  },
});

export const addDomain = mutation({
  args: {
    projectId: v.id("projects"),
    domain: v.string(),
  },
  handler: async (ctx, args) => {
    const domainId = await ctx.db.insert("domains", {
      projectId: args.projectId,
      domain: args.domain,
      status: "pending",
      createdAt: Date.now(),
    });
    return domainId;
  },
});

export const updateDomainStatus = mutation({
  args: {
    domainId: v.id("domains"),
    status: v.union(
      v.literal("pending"),
      v.literal("verifying"),
      v.literal("active"),
      v.literal("error")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.domainId, {
      status: args.status,
    });
  },
});
