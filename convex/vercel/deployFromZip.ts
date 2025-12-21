"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { vercelClient } from "./client";
import AdmZip from "adm-zip";

/**
 * Deploys a codebase from a ZIP file to Vercel
 * SECURITY: This is internal-only
 */
export const deployFromZip = internalAction({
  args: {
    deploymentId: v.id("deployments"),
    storageId: v.id("_storage"),
    projectName: v.string(),
    accessToken: v.string(),
    teamId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: "📦 Extracting ZIP file...",
      });

      // Get the ZIP file from storage
      const zipUrl = await ctx.storage.getUrl(args.storageId);
      if (!zipUrl) {
        throw new Error("ZIP file not found");
      }

      // Download the ZIP file
      const response = await fetch(zipUrl);
      const zipBuffer = Buffer.from(await response.arrayBuffer());

      // Extract ZIP
      const zip = new AdmZip(zipBuffer);
      const zipEntries = zip.getEntries();

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `✓ Found ${zipEntries.length} files in ZIP`,
      });

      // Convert files to Vercel format
      const files: Array<{ file: string; data: string; encoding: string }> = [];
      let totalSize = 0;
      
      for (const entry of zipEntries) {
        if (!entry.isDirectory) {
          const content = entry.getData().toString("utf-8");
          files.push({
            file: entry.entryName,
            data: content,
            encoding: "utf-8",
          });
          totalSize += content.length;
        }
      }

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `✓ Extracted ${files.length} files (${(totalSize / 1024 / 1024).toFixed(2)} MB)`,
      });

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `📤 Uploading to Vercel and starting build process...`,
      });

      // Deploy to Vercel
      const api = vercelClient(args.accessToken);
      const endpoint = args.teamId 
        ? `/v13/deployments?teamId=${args.teamId}` 
        : "/v13/deployments";

      const payload = {
        name: args.projectName,
        files,
        target: "production",
        projectSettings: {
          framework: "vite",
          buildCommand: "npm run build",
          outputDirectory: "dist",
          installCommand: "npm install",
        },
      };

      const res = await api(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Vercel deployment failed: ${error}`);
      }

      const data = await res.json();

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `✓ Deployment created: ${data.id}`,
      });

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `🔨 Vercel is now building your application...`,
      });

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `⏳ This may take 2-5 minutes depending on project size`,
      });

      // Update deployment record
      await ctx.runMutation(internal.vercel.liveDeploymentHelpers.updateVercelDeploymentId, {
        deploymentId: args.deploymentId,
        vercelDeploymentId: data.id,
        productionUrl: `https://${data.url}`,
      });

      // Start polling for status
      await ctx.scheduler.runAfter(3000, internal.vercel.liveDeploymentPolling.pollVercelStatus, {
        deploymentId: args.deploymentId,
        vercelDeploymentId: data.id,
        accessToken: args.accessToken,
        teamId: args.teamId,
        pollCount: 0,
      });

    } catch (error) {
      console.error("Deploy from ZIP error:", error);
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
      await ctx.runMutation(internal.deployments.updateStatus, {
        deploymentId: args.deploymentId,
        status: "failed",
        log: "Deployment failed",
      });
    }
  },
});
