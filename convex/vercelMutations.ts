import { mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const upsertVercelConnection = mutation({
  args: {
    userId: v.id("users"),
    accessToken: v.any(),
    vercelUserId: v.optional(v.string()),
    tokenType: v.optional(v.string()),
    scope: v.optional(v.string()),
    refreshToken: v.optional(v.any()),
    expiresAt: v.optional(v.number()),
    teamId: v.optional(v.string()),
    teamSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("vercelConnections")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        vercelUserId: args.vercelUserId,
        tokenType: args.tokenType,
        scope: args.scope,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        teamId: args.teamId,
        teamSlug: args.teamSlug,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("vercelConnections", {
      userId: args.userId,
      accessToken: args.accessToken,
      vercelUserId: args.vercelUserId,
      tokenType: args.tokenType,
      scope: args.scope,
      refreshToken: args.refreshToken,
      expiresAt: args.expiresAt,
      teamId: args.teamId,
      teamSlug: args.teamSlug,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getConnectionForUser = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("vercelConnections")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
  },
});
