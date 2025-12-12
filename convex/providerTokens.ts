import { internalMutation, internalQuery } from "./_generated/server.js";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

/**
 * Internal mutation to store OAuth connection
 * SECURITY: This is internal-only and never exposed to the frontend
 */
export const storeConnection = internalMutation({
  args: {
    provider: v.string(),
    accessToken: v.string(),
    scopes: v.array(v.string()),
    accountName: v.optional(v.string()),
    accountEmail: v.optional(v.string()),
    teamId: v.optional(v.string()),
    teamName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get current user from auth context
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Find user in database
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();

    // Check if connection already exists
    const existing = await ctx.db
      .query("providerConnections")
      .withIndex("by_user_and_provider", (q) => 
        q.eq("userId", user._id).eq("provider", args.provider)
      )
      .first();

    if (existing) {
      // Update existing connection
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        scopes: args.scopes,
        accountName: args.accountName,
        accountEmail: args.accountEmail,
        teamId: args.teamId,
        teamName: args.teamName,
        connectedAt: now,
        lastValidatedAt: now,
      });
      return existing._id;
    } else {
      // Create new connection
      return await ctx.db.insert("providerConnections", {
        userId: user._id,
        provider: args.provider,
        accessToken: args.accessToken,
        scopes: args.scopes,
        accountName: args.accountName,
        accountEmail: args.accountEmail,
        teamId: args.teamId,
        teamName: args.teamName,
        connectedAt: now,
        lastValidatedAt: now,
      });
    }
  },
});

/**
 * Internal query to get connection with token (for deployment use)
 * SECURITY: This is internal-only and never exposed to the frontend
 */
export const getConnectionWithToken = internalQuery({
  args: {
    userId: v.id("users"),
    provider: v.string(),
  },
  handler: async (ctx, args): Promise<{
    accessToken: string;
    accountName?: string;
    teamId?: string;
  } | null> => {
    const connection = await ctx.db
      .query("providerConnections")
      .withIndex("by_user_and_provider", (q) => 
        q.eq("userId", args.userId).eq("provider", args.provider)
      )
      .first();

    if (!connection) {
      return null;
    }

    return {
      accessToken: connection.accessToken,
      accountName: connection.accountName,
      teamId: connection.teamId,
    };
  },
});
