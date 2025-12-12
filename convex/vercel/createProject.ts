"use node";

import { internalAction } from "../_generated/server.js";
import { v } from "convex/values";
import { vercelClient } from "./client.js";

interface VercelProjectResponse {
  id: string;
  name: string;
  framework: string;
  createdAt: number;
}

/**
 * Creates a new project in Vercel
 * SECURITY: This is internal-only and requires OAuth token
 */
export const createVercelProject = internalAction({
  args: {
    name: v.string(),
    accessToken: v.string(),
    teamId: v.optional(v.string()),
  },
  handler: async (ctx, { name, accessToken, teamId }): Promise<VercelProjectResponse> => {
    const api = vercelClient(accessToken);

    try {
      // Create project with team scope if provided
      const endpoint = teamId ? `/v9/projects?teamId=${teamId}` : "/v9/projects";
      
      const res = await api(endpoint, {
        method: "POST",
        body: JSON.stringify({
          name,
          framework: "vite",
          buildCommand: "npm run build",
          outputDirectory: "dist",
          installCommand: "npm install",
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        console.error("Vercel project creation failed:", error);
        throw new Error(`Failed to create Vercel project: ${res.status}`);
      }

      const data = await res.json() as VercelProjectResponse;
      return data;
    } catch (error) {
      console.error("Error creating Vercel project:", error);
      throw error;
    }
  },
});
