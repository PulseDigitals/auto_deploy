import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const PROVIDER_VERCEL = "vercel";
const PROVIDER_RENDER = "render";

export const getUserConnections = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (!user) return [];

    const [vercelConnection, renderConnection] = await Promise.all([
      ctx.db
        .query("vercelConnections")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .unique(),
      ctx.db
        .query("renderConnections")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .first(),
    ]);

    const connections: any[] = [];

    if (vercelConnection) {
      connections.push({
        provider: PROVIDER_VERCEL,
        hasToken: true,
        teamSlug: vercelConnection.teamSlug,
      });
    }

    if (renderConnection) {
      connections.push({
        provider: PROVIDER_RENDER,
        hasToken: renderConnection.isValid ?? false,
        accountName: renderConnection.accountName,
      });
    }

    return connections;
  },
});

export const isProviderConnected = query({
  args: { provider: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const provider = args.provider;
    if (!provider) return false;

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (!user) return false;

    if (provider === PROVIDER_VERCEL) {
      const connection = await ctx.db
        .query("vercelConnections")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .unique();
      return Boolean(connection);
    }

    if (provider === PROVIDER_RENDER) {
      const connection = await ctx.db
        .query("renderConnections")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .first();
      return Boolean(connection?.isValid);
    }

    return false;
  },
});

export const disconnectProvider = mutation({
  args: { provider: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { success: false };

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (!user) return { success: false };

    if (args.provider === PROVIDER_VERCEL) {
      const connection = await ctx.db
        .query("vercelConnections")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .unique();
      if (connection) {
        await ctx.db.delete(connection._id);
      }
    }

    if (args.provider === PROVIDER_RENDER) {
      const connection = await ctx.db
        .query("renderConnections")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .first();
      if (connection) {
        await ctx.db.delete(connection._id);
      }
    }

    return { success: true };
  },
});
