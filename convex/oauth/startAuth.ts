"use node";

import { action } from "../_generated/server.js";
import { v } from "convex/values";
import { DeploymentOrchestrator } from "../../src/core/deploymentOrchestrator";
import { internal } from "../_generated/api.js";

/**
 * Starts OAuth using the orchestrator so the frontend never constructs auth URLs.
 * Enforces central gateway for providers without dynamic redirect support.
 */
export const startAuth = action({
  args: {
    providerId: v.string(),
    deploymentId: v.string(),
    deploymentUrl: v.string(),
    targetCallback: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.runQuery(internal.users.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });

    if (!user?._id) {
      throw new Error("User not found");
    }

    const orchestrator = new DeploymentOrchestrator();
    const result = await orchestrator.startOAuth({
      providerId: args.providerId,
      deploymentId: args.deploymentId,
      deploymentUrl: args.deploymentUrl,
      userId: user._id as any,
      targetCallback: args.targetCallback,
    });

    return { authUrl: result.authUrl };
  },
});
