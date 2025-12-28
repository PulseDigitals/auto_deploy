import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const storeState = internalMutation({
  args: {
    state: v.string(),
    codeVerifier: v.string(),
    returnTo: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("herculesAuthStates", {
      state: args.state,
      codeVerifier: args.codeVerifier,
      returnTo: args.returnTo,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
      usedAt: null,
    });
  },
});

export const consumeState = internalMutation({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("herculesAuthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();

    if (!record) return null;
    if (record.usedAt || Date.now() > record.expiresAt) return null;

    await ctx.db.patch(record._id, { usedAt: Date.now() });
    return record;
  },
});

export const upsertHerculesUser = mutation({
  args: {
    sub: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tokenIdentifier = `hercules:${args.sub}`;

    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name ?? existing.name,
        email: args.email ?? existing.email,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      tokenIdentifier,
      name: args.name,
      email: args.email,
      subscription: {
        plan: "free",
        activatedAt: Date.now(),
      },
    });
  },
});
