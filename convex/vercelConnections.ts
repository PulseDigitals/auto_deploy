import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getVercelConnection = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    // User not logged in yet
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    // User record not found (edge case)
    if (!user) {
      return null;
    }

    const connection = await ctx.db
      .query("vercelConnections")
      .withIndex("by_userId", (q) =>
        q.eq("userId", user._id)
      )
      .unique();

    // Returning null is correct for "not connected yet"
    return connection ?? null;
  },
});

export const setInstalledTeam = mutation({
  args: {
    teamId: v.string(),
    teamSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { teamSlug: null };

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (!user) return { teamSlug: null };

    const connection = await ctx.db
      .query("vercelConnections")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!connection) {
      return { teamSlug: null };
    }

    await ctx.db.patch(connection._id, {
      teamId: args.teamId,
      teamSlug: args.teamSlug,
      updatedAt: Date.now(),
    });

    return { teamSlug: args.teamSlug };
  },
});

export const disconnectVercel = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { success: false };

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (!user) return { success: false };

    const connection = await ctx.db
      .query("vercelConnections")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!connection) return { success: false };

    await ctx.db.delete(connection._id);
    return { success: true };
  },
});
