import { query } from "./_generated/server";

export const confirmAuth = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return {
        status: "FAIL",
        reason: "NO_CONVEX_IDENTITY",
        details: {
          hasIdentity: false,
        },
      };
    }

    return {
      status: "PASS",
      details: {
        hasIdentity: true,
        subject: identity.subject,
        issuer: identity.issuer,
      },
    };
  },
});
