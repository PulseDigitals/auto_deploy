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
      // First, check if project already exists
      const getEndpoint = teamId 
        ? `/v9/projects/${name}?teamId=${teamId}` 
        : `/v9/projects/${name}`;
      
      const existingRes = await api(getEndpoint, {
        method: "GET",
      });

      if (existingRes.ok) {
        // Project already exists, return it
        const data = await existingRes.json() as VercelProjectResponse;
        console.log("Vercel project already exists, reusing:", name);
        return data;
      }

      // Project doesn't exist, create it
      const createEndpoint = teamId ? `/v9/projects?teamId=${teamId}` : "/v9/projects";
      
      const res = await api(createEndpoint, {
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
        
        // If it's a conflict (409), try to fetch the existing project
        if (res.status === 409) {
          console.log("Project was just created by another process, fetching it...");
          const retryRes = await api(getEndpoint, {
            method: "GET",
          });
          
          if (retryRes.ok) {
            const data = await retryRes.json() as VercelProjectResponse;
            return data;
          }
        }
        
        throw new Error(`Failed to create Vercel project: ${res.status}`);
      }

      const data = await res.json() as VercelProjectResponse;
      console.log("Vercel project created successfully:", name);
      return data;
    } catch (error) {
      console.error("Error creating Vercel project:", error);
      throw error;
    }
  },
});
