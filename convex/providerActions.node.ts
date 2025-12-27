"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const disconnectProvider = action({
  args: { providerId: v.string() },
  handler: async (ctx, args) => {
    await ctx.runMutation(api.providerMutations.disconnectProvider, args);
  },
});
