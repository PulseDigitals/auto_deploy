/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * VERCEL CONNECTIONS - DATABASE CRUD OPERATIONS
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Manages Vercel OAuth connections and team installations
 */

import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server.js";
import type { Id } from "./_generated/dataModel.d.ts";

/**
 * Get Vercel connection for current user
 * Returns masked connection metadata (no access token)
 */
export const getVercelConnection = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      return null;
    }

    const connection = await ctx.db
      .query("vercelConnections")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!connection) {
      return null;
    }

    // Return connection without exposing access token
    return {
      _id: connection._id,
      userId: connection.userId,
      vercelUserId: connection.vercelUserId,
      teamId: connection.teamId,
      teamSlug: connection.teamSlug,
      tokenType: connection.tokenType,
      scope: connection.scope,
      expiresAt: connection.expiresAt,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
      hasToken: !!connection.accessToken,
    };
  },
});

/**
 * Get Vercel connection for actions
 * Note: This is an internal mutation (for use by actions)
 */
export const getVercelConnectionForAction = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("vercelConnections")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!connection) {
      return null;
    }

    return {
      accessToken: connection.accessToken,
      teamId: connection.teamId,
      teamSlug: connection.teamSlug,
    };
  },
});

/**
 * Internal mutation: Upsert Vercel connection
 * Called from OAuth callback handler
 */
export const upsertVercelConnection = internalMutation({
  args: {
    userId: v.id("users"),
    accessToken: v.string(),
    vercelUserId: v.optional(v.string()),
    tokenType: v.optional(v.string()),
    scope: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    teamId: v.optional(v.string()),
    teamSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if connection exists
    const existing = await ctx.db
      .query("vercelConnections")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      // Update existing connection
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
    } else {
      // Create new connection
      const connectionId = await ctx.db.insert("vercelConnections", {
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
      return connectionId;
    }
  },
});

/**
 * Set installed team for Vercel connection
 */
export const setInstalledTeam = mutation({
  args: {
    teamId: v.string(),
    teamSlug: v.string(),
  },
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
      .query("vercelConnections")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!connection) {
      throw new Error("No Vercel connection found. Please connect first.");
    }

    // Update connection with team selection
    await ctx.db.patch(connection._id, {
      teamId: args.teamId,
      teamSlug: args.teamSlug,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      teamSlug: args.teamSlug,
    };
  },
});

/**
 * Disconnect Vercel account
 */
export const disconnectVercel = mutation({
  args: {},
  handler: async (ctx) => {
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
      .query("vercelConnections")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!connection) {
      throw new Error("No Vercel connection found");
    }

    // Delete connection
    await ctx.db.delete(connection._id);

    return { success: true };
  },
});

/**
 * Internal query: Get access token for live deployments
 * Only accessible from backend
 */
export const getAccessTokenForUser = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("vercelConnections")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!connection) {
      return null;
    }

    return {
      accessToken: connection.accessToken,
      teamId: connection.teamId,
      teamSlug: connection.teamSlug,
    };
  },
});
