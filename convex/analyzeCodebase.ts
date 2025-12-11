"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { ConvexError } from "convex/values";

interface ManifestType {
  framework: string;
  frontend: boolean;
  backend: boolean;
  buildCommand: string;
  startCommand: string;
  envVars: string[];
  recommendedProvider: string;
  notes: string;
}

export const analyzeCodebase: ReturnType<typeof action> = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }): Promise<ManifestType> => {
    // Fetch project
    const project: {
      _id: string;
      name: string;
      gitRepoUrl?: string | null;
      createdAt: number;
      status?: string | null;
    } | null = await ctx.runQuery(api.projects.getProjectInternal, {
      projectId,
    });

    if (!project) {
      throw new ConvexError({ message: "Project not found", code: "NOT_FOUND" });
    }

    // Update status → analyzing
    await ctx.runMutation(api.projects.updateProjectStatus, {
      projectId,
      status: "analyzing",
    });

    try {
      // Stubbed manifest (no real AI yet)
      const manifest: ManifestType = {
        framework: "React + Vite",
        frontend: true,
        backend: true,
        buildCommand: "npm run build",
        startCommand: "npm run dev",
        envVars: ["VITE_API_URL", "NODE_ENV"],
        recommendedProvider: "Vercel",
        notes: `Stubbed manifest for project "${project.name}". Replace with real AI analysis later.`,
      };

      // Save manifest
      await ctx.runMutation(api.manifests.createManifest, {
        projectId,
        manifest,
      });

      // Update status → analyzed
      await ctx.runMutation(api.projects.updateProjectStatus, {
        projectId,
        status: "analyzed",
      });

      return manifest;
    } catch (err) {
      // On failure mark status → error
      await ctx.runMutation(api.projects.updateProjectStatus, {
        projectId,
        status: "error",
      });
      throw err;
    }
  },
});
