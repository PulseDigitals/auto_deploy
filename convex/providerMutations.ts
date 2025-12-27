import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const disconnectProvider = mutation({
  args: { providerId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const connection = await ctx.db
      .query("providerConnections")
      .withIndex("by_user_and_provider", (q) =>
        q.eq("userId", user._id).eq("provider", args.providerId)
      )
      .first();

    if (connection) {
      await ctx.db.delete(connection._id);
    }
  },
});

export const saveConnection = internalMutation({
  args: {
    userId: v.id("users"),
    provider: v.string(),
    accessTokenEncrypted: v.string(),
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
        accessToken: args.accessTokenEncrypted,
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
      accessToken: args.accessTokenEncrypted,
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

export const updateLastValidated = internalMutation({
  args: { connectionId: v.id("providerConnections") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, {
      lastValidatedAt: Date.now(),
    });
  },
});
