import { internalQuery, internalMutation } from "../_generated/server.js";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel.d.ts";

/**
 * Internal queries/mutations to support live deployment
 */

export const getDeploymentForLive = internalQuery({
  args: { deploymentId: v.id("deployments") },
  handler: async (ctx, { deploymentId }) => {
    return await ctx.db.get(deploymentId);
  },
});

export const getProjectDetails = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    return await ctx.db.get(projectId);
  },
});

export const updateVercelProjectId = internalMutation({
  args: {
    deploymentId: v.id("deployments"),
    vercelProjectId: v.string(),
  },
  handler: async (ctx, { deploymentId, vercelProjectId }) => {
    await ctx.db.patch(deploymentId, {
      vercelProjectId,
    });
  },
});

export const updateVercelDeploymentId = internalMutation({
  args: {
    deploymentId: v.id("deployments"),
    vercelDeploymentId: v.string(),
    productionUrl: v.string(),
  },
  handler: async (ctx, { deploymentId, vercelDeploymentId, productionUrl }) => {
    await ctx.db.patch(deploymentId, {
      vercelDeploymentId,
      productionUrl,
    });
  },
});
