"use node";

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * RENDER LIVE DEPLOYMENT ORCHESTRATOR
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Orchestrates live deployments to Render
 */

import { internalAction } from "../_generated/server.js";
import { internal } from "../_generated/api.js";
import { v } from "convex/values";
import { RenderClient, type CreateServiceInput, type RenderEnvVar, type RenderService } from "./client.js";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel.d.ts";

/**
 * Detect the default branch of a GitHub repository
 * Tries to fetch from GitHub API, falls back to common branch names
 */
async function detectDefaultBranch(repoUrl: string): Promise<string> {
  try {
    // Extract owner/repo from GitHub URL
    // e.g. https://github.com/PulseDigitals/estate-management-system
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
      console.log("[Branch Detection] Not a GitHub URL, defaulting to main");
      return "main";
    }
    
    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, "");
    
    console.log(`[Branch Detection] Fetching default branch for ${owner}/${cleanRepo}`);
    
    // Call GitHub API to get repository info
    const response = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`, {
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "1-Click-Deploy",
      },
    });
    
    if (response.ok) {
      const data = await response.json() as { default_branch?: string };
      if (data.default_branch) {
        console.log(`[Branch Detection] Found default branch: ${data.default_branch}`);
        return data.default_branch;
      }
    } else {
      console.log(`[Branch Detection] GitHub API failed with status ${response.status}`);
    }
  } catch (error) {
    console.error("[Branch Detection] Error fetching from GitHub:", error);
  }
  
  // Fallback to common branch names
  console.log("[Branch Detection] Falling back to 'main'");
  return "main";
}

/**
 * Detect monorepo structure and configuration
 * Checks for common patterns like client/, frontend/, packages/
 */
async function detectMonorepoStructure(repoUrl: string, branch: string): Promise<{
  isMonorepo: boolean;
  rootDirectory?: string;
  buildCommand?: string;
  publishPath?: string;
}> {
  // Hardcoded fallbacks for known monorepos
  const knownMonorepos: Record<string, { rootDirectory: string; publishPath: string }> = {
    "estate-management-system": { rootDirectory: "client", publishPath: "dist" },
    "estate-management": { rootDirectory: "client", publishPath: "dist" },
  };
  
  // Check if this is a known monorepo
  for (const [pattern, config] of Object.entries(knownMonorepos)) {
    if (repoUrl.toLowerCase().includes(pattern)) {
      console.log(`[Monorepo Detection] Known monorepo pattern matched: ${pattern}`);
      return {
        isMonorepo: true,
        rootDirectory: config.rootDirectory,
        buildCommand: "npm install && npm run build",
        publishPath: config.publishPath,
      };
    }
  }
  
  try {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
      return { isMonorepo: false };
    }
    
    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, "");
    
    console.log(`[Monorepo Detection] Checking ${owner}/${cleanRepo}...`);
    
    // Fetch repository contents
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${cleanRepo}/contents?ref=${branch}`,
      {
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "1-Click-Deploy",
        },
      }
    );
    
    if (!response.ok) {
      console.log(`[Monorepo Detection] Failed to fetch contents: ${response.status}`);
      return { isMonorepo: false };
    }
    
    const contents = await response.json() as Array<{ name: string; type: string }>;
    const directories = contents.filter(item => item.type === "directory").map(item => item.name);
    
    console.log(`[Monorepo Detection] Found directories:`, directories);
    
    // Check for common monorepo patterns
    const commonFrontendDirs = ["client", "frontend", "app", "web", "www"];
    const frontendDir = commonFrontendDirs.find(dir => directories.includes(dir));
    
    if (frontendDir) {
      console.log(`[Monorepo Detection] Detected monorepo with frontend in: ${frontendDir}`);
      return {
        isMonorepo: true,
        rootDirectory: frontendDir,
        buildCommand: "npm install && npm run build",
        publishPath: "dist", // Common Vite/React output directory
      };
    }
    
    // Check if packages/ exists (common in monorepos)
    if (directories.includes("packages")) {
      console.log("[Monorepo Detection] Found 'packages' directory");
      return {
        isMonorepo: true,
        rootDirectory: "packages",
        buildCommand: "npm install && npm run build",
        publishPath: "dist",
      };
    }
    
    console.log("[Monorepo Detection] No monorepo pattern detected");
    return { isMonorepo: false };
    
  } catch (error) {
    console.error("[Monorepo Detection] Error:", error);
    return { isMonorepo: false };
  }
}

/**
 * Execute live deployment to Render
 * Entry point from deployment pipeline
 */
export const executeLiveDeployment = internalAction({
  args: {
    deploymentId: v.id("deployments"),
  },
  handler: async (ctx, args) => {
    // Get deployment record
    const deployment: Doc<"deployments"> | null = await ctx.runQuery(
      internal.deployments.getDeploymentById,
      { deploymentId: args.deploymentId }
    );

    if (!deployment) {
      throw new ConvexError({
        message: "Deployment not found",
        code: "NOT_FOUND",
      });
    }

    // Get project
    const project = await ctx.runQuery(
      internal.projects.getProjectById,
      { projectId: deployment.projectId }
    );

    if (!project) {
      throw new ConvexError({
        message: "Project not found",
        code: "NOT_FOUND",
      });
    }

    // Get user
    if (!deployment.userId) {
      await ctx.runMutation(internal.deployments.updateStatus, {
        deploymentId: args.deploymentId,
        status: "failed",
        log: "❌ No user associated with deployment",
      });
      return;
    }

    // Get Render connection
    const connection: { apiKey: string; accountName?: string; accountEmail?: string } | null = 
      await ctx.runMutation(internal.renderConnections.getApiKeyForAction, {
        userId: deployment.userId,
      });

    if (!connection) {
      await ctx.runMutation(internal.deployments.updateStatus, {
        deploymentId: args.deploymentId,
        status: "failed",
        log: "❌ No Render connection found. Please connect Render in Settings.",
      });
      return;
    }

    // Create Render client
    const client: RenderClient = new RenderClient(connection.apiKey);

    try {
      // Update status to running
      await ctx.runMutation(internal.deployments.updateStatus, {
        deploymentId: args.deploymentId,
        status: "running",
        log: `🚀 Starting LIVE deployment to Render...`,
      });

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `📦 Creating Render service for: ${project.name}`,
      });

      // Validate project has a GitHub repository
      if (!project.gitRepoUrl) {
        await ctx.runMutation(internal.deployments.updateStatus, {
          deploymentId: args.deploymentId,
          status: "failed",
          log: `❌ Render requires a GitHub repository for static site deployments.`,
        });
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `📋 Please add a GitHub repository URL to your project settings and try again.`,
        });
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `💡 Tip: Go to your project settings and add the GitHub repository URL (e.g., https://github.com/username/repo)`,
        });
        
        return;
      }
      
      // Prepare service configuration
      const serviceName = project.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 40);
      
      // Detect default branch from GitHub
      const defaultBranch = await detectDefaultBranch(project.gitRepoUrl);
      
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `🌿 Detected branch: ${defaultBranch}`,
      });
      
      // Detect monorepo structure
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `🔍 Analyzing repository structure...`,
      });
      
      const monorepoConfig = await detectMonorepoStructure(project.gitRepoUrl, defaultBranch);
      
      if (monorepoConfig.isMonorepo) {
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `📦 Monorepo detected! Frontend in: ${monorepoConfig.rootDirectory}`,
        });
      } else {
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `📁 Standard repository structure detected`,
        });
      }
      
      const publishPath = monorepoConfig.publishPath || "dist";
      const baseBuildCommand = monorepoConfig.buildCommand || "npm install && npm run build";
      
      // Build-Time Injection: Automatically add _redirects for SPA routing
      // This eliminates the need for manual GitHub commits or Render dashboard tweaking
      const buildCommand = `${baseBuildCommand} && echo "/*    /index.html   200" > ${publishPath}/_redirects`;
      
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `⚙️ Configuration:`,
      });
      
      if (monorepoConfig.rootDirectory) {
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `   Root: ${monorepoConfig.rootDirectory}`,
        });
      }
      
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `   Build: ${baseBuildCommand}`,
      });
      
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `   Publish: ${publishPath}`,
      });
      
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `   🔧 Auto-injecting SPA routing (_redirects)`,
      });
      
      const serviceInput: CreateServiceInput = {
        name: serviceName,
        type: "static_site",
        runtime: "node",
        buildCommand,
        region: "oregon",
        autoDeploy: true,
        repo: project.gitRepoUrl,
        branch: defaultBranch,
        rootDirectory: monorepoConfig.rootDirectory,
        publishPath,
      };

      // Create service on Render
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `⚙️ Configuring service: ${serviceName}`,
      });

      // Check if service already exists
      let service: RenderService | undefined;
      
      try {
        const existingServices = await client.listServices();
        console.log(`[Render] Found ${existingServices.length} existing services`);
        
        service = existingServices.find(s => s.name === serviceName);
        
        if (service) {
          console.log("[Render] Reusing existing service:", JSON.stringify(service, null, 2));
          
          await ctx.runMutation(internal.deployments.appendLog, {
            deploymentId: args.deploymentId,
            message: `♻️ Found existing service: ${service.id}`,
          });
          
          // Update the service configuration
          await ctx.runMutation(internal.deployments.appendLog, {
            deploymentId: args.deploymentId,
            message: `🔧 Updating service configuration...`,
          });
          
          service = await client.updateService(service.id, {
            rootDirectory: monorepoConfig.rootDirectory,
            publishPath,
            buildCommand,
          });
          
          await ctx.runMutation(internal.deployments.appendLog, {
            deploymentId: args.deploymentId,
            message: `✅ Service configuration updated`,
          });
        }
      } catch (error) {
        console.log("[Render] Could not list services:", error);
      }
      
      // Create new service only if it doesn't exist
      if (!service) {
        service = await client.createService(serviceInput);
        
        console.log("[Render] Service creation response:", JSON.stringify(service, null, 2));
        console.log("[Render] Service ID:", service.id);

        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `✅ Service created with ID: ${service.id}`,
        });
      }
      
      // Validate service ID
      if (!service || !service.id) {
        throw new Error("Failed to get valid service ID from Render");
      }

      // Trigger initial deploy
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `🔨 Triggering initial deployment...`,
      });

      const deploy = await client.triggerDeploy(service.id);

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `📡 Deploy initiated (ID: ${deploy.id})`,
      });

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `⏳ Deploy status: ${deploy.status}`,
      });

      if (service.serviceDetails.url) {
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `🌐 Service URL: ${service.serviceDetails.url}`,
        });
      }

      // Mark as success (or live_deploying if we want to poll status)
      await ctx.runMutation(internal.deployments.updateStatus, {
        deploymentId: args.deploymentId,
        status: "success",
        log: `✅ Successfully deployed to Render! (SPA routing auto-configured)`,
      });

      // Store production URL if available
      if (service.serviceDetails.url) {
        await ctx.runMutation(internal.deployments.updateProductionUrl, {
          deploymentId: args.deploymentId,
          productionUrl: service.serviceDetails.url,
        });
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `🎉 Your app is live! All routes automatically configured for React Router.`,
        });
      }

    } catch (error) {
      console.error("[Render Deployment Error]", error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      console.error("[Render Deployment Error] Message:", errorMessage);
      if (errorStack) {
        console.error("[Render Deployment Error] Stack:", errorStack);
      }
      
      await ctx.runMutation(internal.deployments.updateStatus, {
        deploymentId: args.deploymentId,
        status: "failed",
        log: `❌ Deployment failed: ${errorMessage}`,
      });

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `🔍 Error details: ${errorMessage}`,
      });
      
      if (errorStack && errorStack.length < 500) {
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `📋 Stack trace: ${errorStack.substring(0, 500)}`,
        });
      }
    }
  },
});
