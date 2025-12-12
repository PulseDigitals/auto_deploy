import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// Public query to get user's provider connections (without tokens)
export const getUserConnections = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      return [];
    }

    const connections = await ctx.db
      .query("providerConnections")
      .withIndex("by_user_and_provider", (q) => q.eq("userId", user._id))
      .collect();

    // SECURITY: Never expose tokens in public queries
    return connections.map((conn) => ({
      _id: conn._id,
      provider: conn.provider,
      accountName: conn.accountName,
      accountEmail: conn.accountEmail,
      teamId: conn.teamId,
      teamName: conn.teamName,
      scopes: conn.scopes,
      connectedAt: conn.connectedAt,
      lastValidatedAt: conn.lastValidatedAt,
    }));
  },
});

// Public query to check if a specific provider is connected
export const isProviderConnected = query({
  args: {
    provider: v.string(),
  },
  handler: async (ctx, { provider }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      return false;
    }

    const connection = await ctx.db
      .query("providerConnections")
      .withIndex("by_user_and_provider", (q) => 
        q.eq("userId", user._id).eq("provider", provider)
      )
      .first();

    return connection !== null;
  },
});

// Public mutation to disconnect provider
export const disconnectProvider = mutation({
  args: {
    provider: v.string(),
  },
  handler: async (ctx, { provider }) => {
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
        q.eq("userId", user._id).eq("provider", provider)
      )
      .first();

    if (connection) {
      await ctx.db.delete(connection._id);
    }
  },
});

// Internal mutation to save OAuth connection
export const saveConnection = internalMutation({
  args: {
    userId: v.id("users"),
    provider: v.string(),
    accessToken: v.string(),
    scopes: v.array(v.string()),
    accountName: v.optional(v.string()),
    accountEmail: v.optional(v.string()),
    teamId: v.optional(v.string()),
    teamName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if connection already exists
    const existing = await ctx.db
      .query("providerConnections")
      .withIndex("by_user_and_provider", (q) => 
        q.eq("userId", args.userId).eq("provider", args.provider)
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
        userId: args.userId,
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

// Internal query to get connection (with token)
export const getConnection = internalQuery({
  args: {
    connectionId: v.id("providerConnections"),
  },
  handler: async (ctx, { connectionId }) => {
    return await ctx.db.get(connectionId);
  },
});

// Internal mutation to update last validated timestamp
export const updateLastValidated = internalMutation({
  args: {
    connectionId: v.id("providerConnections"),
  },
  handler: async (ctx, { connectionId }) => {
    await ctx.db.patch(connectionId, {
      lastValidatedAt: Date.now(),
    });
  },
});
