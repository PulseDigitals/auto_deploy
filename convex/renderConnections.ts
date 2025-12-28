import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getRenderConnection = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (!user) return null;

    return await ctx.db
      .query("renderConnections")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();
  },
});

export const disconnectRender = mutation({
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
      .query("renderConnections")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!connection) return { success: false };

    await ctx.db.delete(connection._id);
    return { success: true };
  },
});
