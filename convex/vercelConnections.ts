import { query } from "convex/server";

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
