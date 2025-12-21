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
  },
  handler: async (ctx, { projectName, accessToken, teamId }): Promise<VercelDeploymentResponse> => {
    const api = vercelClient(accessToken);

    try {
      // Create a minimal deployment with placeholder files
      // In production, this would be the actual built app files
      const files = [
        {
          file: "index.html",
          data: Buffer.from(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Deploy Agent</title>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    h1 {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    p {
      font-size: 1.25rem;
      opacity: 0.9;
    }
    .badge {
      display: inline-block;
      padding: 0.5rem 1rem;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 9999px;
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 AI Deploy Agent</h1>
    <p>Successfully deployed to Vercel!</p>
    <div class="badge">Live Deployment</div>
  </div>
</body>
</html>`).toString("base64"),
        },
      ];

      // Build deployment payload
      const payload: Record<string, unknown> = {
        name: projectName,
        project: projectName,
        target: "production",
        files,
      };

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
