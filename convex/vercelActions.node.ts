"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { encryptToken, decryptToken } from "./lib/tokenEncryption";

export const upsertVercelConnection = action({
  args: {
    userId: v.id("users"),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    vercelUserId: v.optional(v.string()),
    tokenType: v.optional(v.string()),
    scope: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    teamId: v.optional(v.string()),
    teamSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const encryptedAccess = encryptToken(args.accessToken);
    const encryptedRefresh = args.refreshToken ? encryptToken(args.refreshToken) : undefined;

    await ctx.runMutation(api.vercelMutations.upsertVercelConnection, {
      userId: args.userId,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      vercelUserId: args.vercelUserId,
      tokenType: args.tokenType,
      scope: args.scope,
      expiresAt: args.expiresAt,
      teamId: args.teamId,
      teamSlug: args.teamSlug,
    });
  },
});

export const getVercelConnectionForAction = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.runQuery(internal.vercelMutations.getConnectionForUser, {
      userId: args.userId,
    });
    if (!connection) return null;
    return {
      accessToken: connection.accessToken ? decryptToken(connection.accessToken as any) : undefined,
      teamId: connection.teamId,
      teamSlug: connection.teamSlug,
    };
  },
});

export const getAccessTokenForUser = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.runQuery(internal.vercelMutations.getConnectionForUser, {
      userId: args.userId,
    });
    if (!connection) return null;
    return {
      accessToken: connection.accessToken ? decryptToken(connection.accessToken as any) : undefined,
      teamId: connection.teamId,
      teamSlug: connection.teamSlug,
    };
  },
});
