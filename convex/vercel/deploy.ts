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
      // Create a minimal static site deployment
      // For static sites, we just need the HTML file
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
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
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
      padding: 3rem;
      max-width: 600px;
    }
    h1 {
      font-size: 3.5rem;
      margin-bottom: 1rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    p {
      font-size: 1.5rem;
      opacity: 0.95;
      margin-bottom: 2rem;
      line-height: 1.6;
    }
    .badge {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      background: rgba(255, 255, 255, 0.25);
      border-radius: 9999px;
      font-size: 1rem;
      font-weight: 600;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .details {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
    }
    .detail-item {
      margin: 0.75rem 0;
      opacity: 0.85;
      font-size: 1.125rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 AI Deploy Agent</h1>
    <p>Your deployment was successful!</p>
    <div class="badge">✓ Live on Vercel</div>
    <div class="details">
      <div class="detail-item">Powered by AI Deploy Agent</div>
      <div class="detail-item">Deployed with ❤️ to Vercel</div>
    </div>
  </div>
</body>
</html>`).toString("base64"),
        },
      ];

      // Build deployment payload
      const payload: Record<string, unknown> = {
        name: projectName,
        files,
        target: "production",
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
