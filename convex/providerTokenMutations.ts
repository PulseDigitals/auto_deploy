import { mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const saveProviderTokens = mutation({
  args: {
    provider: v.string(),
    userId: v.id("users"),
    accessToken: v.any(),
    refreshToken: v.optional(v.any()),
    scopes: v.array(v.string()),
    accountName: v.optional(v.string()),
    accountEmail: v.optional(v.string()),
    teamId: v.optional(v.string()),
    teamName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("providerConnections")
      .withIndex("by_user_and_provider", (q) =>
        q.eq("userId", args.userId).eq("provider", args.provider)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        scopes: args.scopes,
        accountName: args.accountName,
        accountEmail: args.accountEmail,
        teamId: args.teamId,
        teamName: args.teamName,
        connectedAt: now,
        lastValidatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("providerConnections", {
      userId: args.userId,
      provider: args.provider,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      scopes: args.scopes,
      accountName: args.accountName,
      accountEmail: args.accountEmail,
      teamId: args.teamId,
      teamName: args.teamName,
      connectedAt: now,
      lastValidatedAt: now,
    });
  },
});

export const getConnectionWithToken = internalQuery({
  args: {
    userId: v.id("users"),
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("providerConnections")
      .withIndex("by_user_and_provider", (q) =>
        q.eq("userId", args.userId).eq("provider", args.provider)
      )
      .first();
  },
});
