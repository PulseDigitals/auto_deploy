"use node";

import { internalAction } from "../_generated/server.js";
import { v } from "convex/values";
import { vercelClient } from "./client.js";

interface VercelDeploymentResponse {
  id: string;
  url: string;
  readyState: string;
  createdAt: number;
  creator?: {
    uid: string;
    username: string;
  };
}

/**
 * Triggers a deployment on Vercel
 * SECURITY: This is internal-only and requires OAuth token
 */
export const triggerDeployment = internalAction({
  args: {
    projectName: v.string(),
    accessToken: v.string(),
    teamId: v.optional(v.string()),
    gitUrl: v.optional(v.string()),
  },
  handler: async (ctx, { projectName, accessToken, teamId, gitUrl }): Promise<VercelDeploymentResponse> => {
    const api = vercelClient(accessToken);

    try {
      // Build deployment payload
      const payload: Record<string, unknown> = {
        name: projectName,
        project: projectName,
        target: "production",
      };

      // Add git source if provided
      if (gitUrl) {
        payload.gitSource = {
          type: "github",
          repoId: gitUrl,
          ref: "main",
        };
      }

      // Create deployment with team scope if provided
      const endpoint = teamId ? `/v13/deployments?teamId=${teamId}` : "/v13/deployments";
      
      const res = await api(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.text();
        console.error("Vercel deployment trigger failed:", error);
        throw new Error(`Failed to trigger Vercel deployment: ${res.status}`);
      }

      const data = await res.json() as VercelDeploymentResponse;
      return data;
    } catch (error) {
      console.error("Error triggering Vercel deployment:", error);
      throw error;
    }
  },
});
