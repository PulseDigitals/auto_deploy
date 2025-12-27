"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { encryptToken, decryptToken } from "./lib/tokenEncryption";

export const saveProviderTokens = action({
  args: {
    provider: v.string(),
    userId: v.id("users"),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    scopes: v.array(v.string()),
    accountName: v.optional(v.string()),
    accountEmail: v.optional(v.string()),
    teamId: v.optional(v.string()),
    teamName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const encryptedAccess = encryptToken(args.accessToken);
    const encryptedRefresh = args.refreshToken ? encryptToken(args.refreshToken) : undefined;

    await ctx.runMutation(api.providerTokenMutations.saveProviderTokens, {
      provider: args.provider,
      userId: args.userId,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      scopes: args.scopes,
      accountName: args.accountName,
      accountEmail: args.accountEmail,
      teamId: args.teamId,
      teamName: args.teamName,
    });
  },
});

export const getConnectionWithToken = action({
  args: {
    userId: v.id("users"),
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.runQuery(internal.providerTokenMutations.getConnectionWithToken, {
      userId: args.userId,
      provider: args.provider,
    });
    if (!connection) return null;
    return {
      ...connection,
      accessToken: connection.accessToken
        ? decryptToken(connection.accessToken as any)
        : undefined,
      refreshToken: connection.refreshToken
        ? decryptToken(connection.refreshToken as any)
        : undefined,
    };
  },
});
