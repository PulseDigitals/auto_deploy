"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";

export const analyzeCodebase = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    // Get project
    const project = await ctx.runQuery(internal.projects.getProjectInternal, {
      projectId,
    });

    if (!project) {
      throw new ConvexError({ message: "Project not found", code: "NOT_FOUND" });
    }

    // Set status → analyzing
    await ctx.runMutation(internal.projects.updateProjectStatus, {
      projectId,
      status: "analyzing",
    });

    try {
      // ---- STUBBED MANIFEST (no external AI yet) ----
      const manifest = {
        framework: "React + Vite",
        frontend: true,
        backend: true,
        buildCommand: "npm run build",
        startCommand: "npm run dev",
        envVars: ["VITE_API_URL", "NODE_ENV"],
        recommendedProvider: "Vercel",
        notes: `Stubbed manifest for project "${project.name}". Replace with real AI analysis later.`,
      };
      // ----------------------------------------------

      // Save manifest
      await ctx.runMutation(internal.manifests.createManifest, {
        projectId,
        manifest,
      });

      // Set status → analyzed
      await ctx.runMutation(internal.projects.updateProjectStatus, {
        projectId,
        status: "analyzed",
      });

      return manifest;
    } catch (err) {
      // On failure mark status → error
      await ctx.runMutation(internal.projects.updateProjectStatus, {
        projectId,
        status: "error",
      });
      throw err;
    }
  },
});
