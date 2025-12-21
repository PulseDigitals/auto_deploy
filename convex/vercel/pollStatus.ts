"use node";

import { internalAction } from "../_generated/server.js";
import { v } from "convex/values";
import { vercelClient } from "./client.js";

interface VercelDeploymentStatus {
  id: string;
  readyState: string; // "QUEUED" | "BUILDING" | "READY" | "ERROR" | "CANCELED"
  state: string;
  url: string;
  createdAt: number;
  buildingAt?: number;
  ready?: number;
  errorMessage?: string; // Error message from Vercel
  errorCode?: string; // Error code from Vercel
}

/**
 * Polls deployment status from Vercel
 * SECURITY: This is internal-only and requires OAuth token
 */
export const pollDeploymentStatus = internalAction({
  args: {
    deploymentId: v.string(),
    accessToken: v.string(),
    teamId: v.optional(v.string()),
  },
  handler: async (ctx, { deploymentId, accessToken, teamId }): Promise<VercelDeploymentStatus> => {
    const api = vercelClient(accessToken);

    try {
      // Get deployment status with team scope if provided
      const endpoint = teamId 
        ? `/v13/deployments/${deploymentId}?teamId=${teamId}` 
        : `/v13/deployments/${deploymentId}`;
      
      const res = await api(endpoint);

      if (!res.ok) {
        const error = await res.text();
        console.error("Vercel status poll failed:", error);
        throw new Error(`Failed to poll Vercel deployment status: ${res.status}`);
      }

      const data = await res.json() as VercelDeploymentStatus;
      
      // Log full deployment status for debugging errors
      if (data.readyState === "ERROR" || data.readyState === "CANCELED") {
        console.error("Vercel deployment failed:", JSON.stringify(data, null, 2));
      }
      
      return data;
    } catch (error) {
      console.error("Error polling Vercel deployment status:", error);
      throw error;
    }
  },
});

/**
 * Maps Vercel readyState to our deployment status
 */
export function mapVercelStatus(readyState: string): string {
  switch (readyState) {
    case "QUEUED":
      return "pending";
    case "BUILDING":
      return "running";
    case "READY":
      return "success";
    case "ERROR":
    case "CANCELED":
      return "failed";
    default:
      return "pending";
  }
}
