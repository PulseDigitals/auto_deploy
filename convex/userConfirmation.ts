import { query } from "./_generated/server";

export const confirmUserRecord = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return {
        status: "FAIL",
        reason: "NO_CONVEX_IDENTITY",
      };
    }

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkUserId"), identity.subject))
      .first();

    if (!user) {
      return {
        status: "FAIL",
        reason: "NO_USER_RECORD",
      };
    }

    return {
      status: "PASS",
      details: {
        userId: user._id,
        clerkUserId: user.clerkUserId,
      },
    };
  },
});
