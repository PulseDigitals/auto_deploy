"use node";

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * RENDER API KEY VALIDATION
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Validates Render API keys and stores connection
 */

import { action } from "../_generated/server.js";
import { api, internal } from "../_generated/api.js";
import { v, ConvexError } from "convex/values";
import { RenderClient } from "./client.js";
import type { Doc, Id } from "../_generated/dataModel.d.ts";

/**
 * Connect Render account by validating API key
 * This is the primary entry point for users to connect Render
 */
export const connectRender = action({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not authenticated",
        code: "UNAUTHENTICATED",
      });
    }

    // Get user from database
    const user: Doc<"users"> | null = await ctx.runQuery(internal.users.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    // Validate API key format
    if (!args.apiKey.startsWith("rnd_")) {
      throw new ConvexError({
        message: "Invalid API key format. Render API keys start with 'rnd_'",
        code: "BAD_REQUEST",
      });
    }

    // Validate API key with Render
    const client = new RenderClient(args.apiKey);
    const validation = await client.validateApiKey();

    if (!validation.valid) {
      throw new ConvexError({
        message: validation.error || "Invalid Render API key",
        code: "FORBIDDEN",
      });
    }

    // Store connection in database
    await ctx.runMutation(api.renderMutations.upsertRenderConnection, {
      userId: user._id,
      apiKey: args.apiKey, // TODO: Encrypt at rest in production
      accountName: validation.owner?.name,
      accountEmail: validation.owner?.email,
      isValid: true,
    });

    return {
      success: true,
      accountName: validation.owner?.name,
      accountEmail: validation.owner?.email,
    };
  },
});

/**
 * Revalidate existing Render connection
 */
export const revalidateRenderConnection = action({
  args: {},
  handler: async (ctx): Promise<{
    success: boolean;
    accountName?: string;
    accountEmail?: string;
  }> => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not authenticated",
        code: "UNAUTHENTICATED",
      });
    }

    // Get user from database
    const user: Doc<"users"> | null = await ctx.runQuery(internal.users.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    // Get existing connection
    const connection: { apiKey: string; accountName?: string; accountEmail?: string } | null = 
    await ctx.runMutation(internal.renderMutations.getApiKeyForAction, {
      userId: user._id,
    });

    if (!connection) {
      throw new ConvexError({
        message: "No Render connection found",
        code: "NOT_FOUND",
      });
    }

    // Validate API key with Render
    const client: RenderClient = new RenderClient(connection.apiKey);
    const validation: Awaited<ReturnType<RenderClient["validateApiKey"]>> = await client.validateApiKey();

    if (!validation.valid) {
      // Mark connection as invalid
      await ctx.runMutation(api.renderMutations.markConnectionInvalid, {
        userId: user._id,
      });

      throw new ConvexError({
        message: validation.error || "API key is no longer valid",
        code: "FORBIDDEN",
      });
    }

    // Update connection with fresh validation
    await ctx.runMutation(api.renderMutations.upsertRenderConnection, {
      userId: user._id,
      apiKey: connection.apiKey,
      accountName: validation.owner?.name,
      accountEmail: validation.owner?.email,
      isValid: true,
    });

    return {
      success: true,
      accountName: validation.owner?.name,
      accountEmail: validation.owner?.email,
    };
  },
});
