/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * RENDER CONNECTIONS - DATABASE CRUD OPERATIONS
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Manages Render API Key connections
 * Note: Render uses API Keys, NOT OAuth
 */

import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server.js";
import type { Id } from "./_generated/dataModel.d.ts";

/**
 * Get Render connection for current user
 * Returns masked connection metadata (no API key)
 */
export const getRenderConnection = query({
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
      .query("renderConnections")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!connection) {
      return null;
    }

    // Return connection without exposing API key
    // Mask the API key: show first 8 chars and last 4 chars
    const maskedKey = connection.apiKey 
      ? `${connection.apiKey.substring(0, 8)}****${connection.apiKey.substring(connection.apiKey.length - 4)}`
      : undefined;

    return {
      _id: connection._id,
      userId: connection.userId,
      accountName: connection.accountName,
      accountEmail: connection.accountEmail,
      isValid: connection.isValid,
      lastValidatedAt: connection.lastValidatedAt,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
      maskedApiKey: maskedKey,
      hasApiKey: !!connection.apiKey,
    };
  },
});

/**
 * Internal mutation: Get Render API key for actions
 * Note: This is an internal mutation (for use by actions only)
 */
export const getApiKeyForAction = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("renderConnections")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!connection || !connection.isValid) {
      return null;
    }

    return {
      apiKey: connection.apiKey,
      accountName: connection.accountName,
      accountEmail: connection.accountEmail,
    };
  },
});

/**
 * Internal mutation: Upsert Render connection
 * Called from validation action
 */
export const upsertRenderConnection = internalMutation({
  args: {
    userId: v.id("users"),
    apiKey: v.string(),
    accountName: v.optional(v.string()),
    accountEmail: v.optional(v.string()),
    isValid: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if connection exists
    const existing = await ctx.db
      .query("renderConnections")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      // Update existing connection
      await ctx.db.patch(existing._id, {
        apiKey: args.apiKey,
        accountName: args.accountName,
        accountEmail: args.accountEmail,
        isValid: args.isValid,
        lastValidatedAt: now,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new connection
      const connectionId = await ctx.db.insert("renderConnections", {
        userId: args.userId,
        apiKey: args.apiKey,
        accountName: args.accountName,
        accountEmail: args.accountEmail,
        isValid: args.isValid,
        lastValidatedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      return connectionId;
    }
  },
});

/**
 * Disconnect Render account
 */
export const disconnectRender = mutation({
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
      .query("renderConnections")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!connection) {
      throw new Error("No Render connection found");
    }

    // Delete connection
    await ctx.db.delete(connection._id);

    return { success: true };
  },
});

/**
 * Internal mutation: Mark connection as invalid
 * Called when API key fails validation
 */
export const markConnectionInvalid = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("renderConnections")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!connection) {
      return { success: false };
    }

    await ctx.db.patch(connection._id, {
      isValid: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
