import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";

// Public action to initiate Vercel OAuth flow
export const connectVercel = action({
  args: {},
  handler: async (ctx): Promise<{ authUrl: string; state: string | null; userId: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "Not authenticated",
        code: "UNAUTHENTICATED",
      });
    }

    // Get user from database
    const user: { _id: Id<"users"> } | null = await ctx.runQuery(internal.users.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    // Initiate OAuth flow
    const result: { authUrl: string; state: string | null } = await ctx.runAction(internal.providerAuth.initiateVercelOAuth, {});
    
    return {
      ...result,
      userId: user._id,
    };
  },
});

// Public action to handle OAuth callback
export const handleOAuthCallback = action({
  args: {
    code: v.string(),
    provider: v.string(),
  },
  handler: async (ctx, { code, provider }): Promise<{ success: boolean; accountName: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "Not authenticated",
        code: "UNAUTHENTICATED",
      });
    }

    // Get user from database
    const user: { _id: Id<"users"> } | null = await ctx.runQuery(internal.users.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    // Handle callback based on provider
    if (provider === "vercel") {
      return await ctx.runAction(internal.providerAuth.handleVercelCallback, {
        code,
        userId: user._id,
      });
    }

    throw new ConvexError({
      message: `Unsupported provider: ${provider}`,
      code: "BAD_REQUEST",
    });
  },
});
