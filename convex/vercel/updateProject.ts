"use node";

import { internalAction } from "../_generated/server.js";
import { v } from "convex/values";
import { vercelClient } from "./client.js";

/**
 * Updates Vercel project settings to disable build process
 * This is needed to deploy pure static HTML without any build step
 * SECURITY: This is internal-only and requires OAuth token
 */
export const updateProjectSettings = internalAction({
  args: {
    projectName: v.string(),
    accessToken: v.string(),
    teamId: v.optional(v.string()),
  },
  handler: async (ctx, { projectName, accessToken, teamId }): Promise<void> => {
    const api = vercelClient(accessToken);

    try {
      const endpoint = teamId 
        ? `/v9/projects/${projectName}?teamId=${teamId}` 
        : `/v9/projects/${projectName}`;
      
      const res = await api(endpoint, {
        method: "PATCH",
        body: JSON.stringify({
          framework: null,
          buildCommand: null,
          outputDirectory: null,
          installCommand: null,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        console.error("Failed to update Vercel project settings:", error);
        throw new Error(`Failed to update project settings: ${res.status}`);
      }

      console.log("Successfully updated Vercel project to static site (no build)");
    } catch (error) {
      console.error("Error updating Vercel project:", error);
      throw error;
    }
  },
});
