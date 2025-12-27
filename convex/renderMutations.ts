import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Fetch stored Render API key for actions (internal only)
 */
export const getApiKeyForAction = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("renderConnections")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    if (!connection || !connection.apiKey) return null;
    return {
      apiKey: connection.apiKey,
      isValid: connection.isValid,
      accountName: connection.accountName,
      accountEmail: connection.accountEmail,
      lastValidatedAt: connection.lastValidatedAt,
    };
  },
});

/**
 * Upsert a Render connection (DB-only; tokens already encrypted if needed)
 */
export const upsertRenderConnection = mutation({
  args: {
    userId: v.id("users"),
    apiKey: v.string(),
    isValid: v.boolean(),
    accountName: v.optional(v.string()),
    accountEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("renderConnections").first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        apiKey: args.apiKey,
        isValid: args.isValid,
        accountName: args.accountName,
        accountEmail: args.accountEmail,
        lastValidatedAt: now,
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("renderConnections", {
      userId: args.userId,
      apiKey: args.apiKey,
      isValid: args.isValid,
      accountName: args.accountName,
      accountEmail: args.accountEmail,
      createdAt: now,
      updatedAt: now,
      lastValidatedAt: now,
    });
  },
});

/**
 * Mark an existing Render connection invalid
 */
export const markConnectionInvalid = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("renderConnections")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    if (!existing) return;
    await ctx.db.patch(existing._id, {
      isValid: false,
      updatedAt: Date.now(),
      lastValidatedAt: Date.now(),
    });
  },
});
