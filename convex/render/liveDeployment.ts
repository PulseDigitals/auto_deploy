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
import { RenderClient, type CreateServiceInput, type RenderEnvVar, type RenderService, type RenderRoute } from "./client.js";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel.d.ts";

/**
 * Detect the default branch of a GitHub repository
 * Tries to fetch from GitHub API, falls back to common branch names
 * Returns null if repository is not accessible
 */
async function detectDefaultBranch(repoUrl: string): Promise<{ branch: string; accessible: boolean; error?: string }> {
  try {
    // Extract owner/repo from GitHub URL
    // e.g. https://github.com/PulseDigitals/estate-management-system
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
      console.log("[Branch Detection] Not a GitHub URL, defaulting to main");
      return { branch: "main", accessible: true };
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
        return { branch: data.default_branch, accessible: true };
      }
      return { branch: "main", accessible: true };
    } else if (response.status === 404) {
      console.log(`[Branch Detection] Repository not found (404)`);
      return { 
        branch: "main", 
        accessible: false, 
        error: "Repository not found or is private" 
      };
    } else {
      console.log(`[Branch Detection] GitHub API failed with status ${response.status}`);
      return { 
        branch: "main", 
        accessible: false, 
        error: `GitHub returned ${response.status}` 
      };
    }
  } catch (error) {
    console.error("[Branch Detection] Error fetching from GitHub:", error);
    return { 
      branch: "main", 
      accessible: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
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

      // CRITICAL: Check deployment source - Render only supports GitHub pathway
      const deploymentSource = deployment.deploymentSource || "github";
      
      if (deploymentSource === "zip") {
        // Render does NOT support codebase/ZIP pathway - API limitation
        await ctx.runMutation(internal.deployments.updateStatus, {
          deploymentId: args.deploymentId,
          status: "failed",
          log: `❌ Render does not support codebase pathway deployments`,
        });
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `📋 Render only supports GitHub-based deployments for static sites`,
        });
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `💡 Solution 1: Use Vercel for codebase pathway (Vercel supports ZIP uploads)`,
        });
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `💡 Solution 2: Push your code to GitHub and use GitHub pathway with Render`,
        });
        
        return;
      }
      
      // For GitHub pathway, validate repository URL
      const gitRepoUrl = deployment.sourceGitHubUrl || project.gitRepoUrl;
      
      if (!gitRepoUrl) {
        await ctx.runMutation(internal.deployments.updateStatus, {
          deploymentId: args.deploymentId,
          status: "failed",
          log: `❌ GitHub repository URL is required for Render deployments`,
        });
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `📋 Please add a GitHub repository URL to your project settings`,
        });
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `💡 Tip: Go to project settings and add the GitHub URL (e.g., https://github.com/username/repo)`,
        });
        
        return;
      }
      
      // Prepare service configuration
      const serviceName = project.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 40);
      
      // Detect default branch from GitHub
      const branchResult = await detectDefaultBranch(gitRepoUrl);
      
      // Check if repository is accessible
      if (!branchResult.accessible) {
        await ctx.runMutation(internal.deployments.updateStatus, {
          deploymentId: args.deploymentId,
          status: "failed",
          log: `❌ Cannot access GitHub repository: ${branchResult.error}`,
        });
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `🔍 Repository URL: ${gitRepoUrl}`,
        });
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `❌ Error: ${branchResult.error}`,
        });
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `📋 Possible causes:`,
        });
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `   • Repository doesn't exist or was deleted`,
        });
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `   • Repository is private and not authorized`,
        });
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `   • Repository URL is incorrect`,
        });
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `💡 Solutions:`,
        });
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `   1. Verify the repository URL in project settings`,
        });
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `   2. If private: Go to Render dashboard → Connect GitHub → Authorize repository`,
        });
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `   3. Ensure repository exists at: ${gitRepoUrl}`,
        });
        
        return;
      }
      
      const defaultBranch = branchResult.branch;
      
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `🌿 Detected branch: ${defaultBranch}`,
      });
      
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // HOSTING INTELLIGENCE MODULE
      // Automatically analyze codebase and generate deployment plan
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `🧠 Analyzing codebase with Hosting Intelligence...`,
      });
      
      // Import hosting intelligence
      const { analyzeGitHubRepo } = await import("./codebaseAnalyzer.js");
      const {
        analyzeCodebase,
        generateDeploymentPlan,
      } = await import("../hostingIntelligence.js");
      
      // Import Blueprint generator
      const {
        generateRenderBlueprint,
        requiresBlueprint,
      } = await import("../renderBlueprint.js");
      
      // Fetch and analyze repository
      const analysis = await analyzeGitHubRepo(gitRepoUrl, defaultBranch);
      
      if (analysis.error) {
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `⚠️ Could not analyze repository: ${analysis.error}`,
        });
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `📋 Using standard configuration as fallback`,
        });
      }
      
      // Generate codebase fingerprint
      const fingerprint = analyzeCodebase(analysis.files, analysis.packageJson);
      
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `✅ Detected: ${fingerprint.framework} ${fingerprint.hasMonorepo ? "(monorepo)" : ""}`,
      });
      
      if (fingerprint.routerMode === "browser") {
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `🔄 SPA routing detected - automatic configuration will be applied`,
        });
      }
      
      // Generate deployment plan
      const deploymentPlan = generateDeploymentPlan(fingerprint, "render");
      
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `📋 Deployment Plan: ${deploymentPlan.explanation}`,
      });
      
      // Log technical notes
      for (const note of deploymentPlan.technicalNotes) {
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `   ✓ ${note}`,
        });
      }
      
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `⚙️ Configuration:`,
      });
      
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `   Build: npm run build:frontend`,
      });
      
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `   Publish: client/dist`,
      });
      
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // RENDER BLUEPRINT AUTO-GENERATION
      // Generate Blueprint for SPA routing if needed
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      
      let blueprintRoutes: RenderRoute[] | undefined;
      let needsRedirectsFile = false;
      
      // Check if this deployment requires Blueprint-based SPA routing
      if (requiresBlueprint({
        appType: deploymentPlan.appType,
        framework: fingerprint.framework,
        routerMode: fingerprint.routerMode,
        needsSpaRewrite: fingerprint.needsSpaRewrite,
      })) {
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `📋 SPA routing configuration required...`,
        });
        
        // NOTE: Render's REST API does not support the 'routes' field for static sites
        // The 'routes' configuration only works with render.yaml Blueprint files
        // Since we're deploying via API, we need a _redirects file in the repo
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `⚠️ Render requires a _redirects file for SPA routing`,
        });
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `📝 Please add the following file to your repository:`,
        });
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `   Location: client/public/_redirects`,
        });
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `   Content: /*    /index.html   200`,
        });
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `💡 This file will fix all 404 errors on client-side routes`,
        });
        
        needsRedirectsFile = true;
      }
      
      const serviceInput: CreateServiceInput = {
        name: serviceName,
        type: "static_site",
        runtime: "node",
        buildCommand: "npm install && npm run build:frontend", // Use the root package.json script
        region: "oregon",
        autoDeploy: true,
        repo: gitRepoUrl,
        branch: defaultBranch,
        rootDirectory: undefined, // Don't set root - build from repo root
        publishPath: "client/dist", // Output is at client/dist from root
        // Note: 'routes' field is not supported by Render's REST API for static sites
        // Must use _redirects file in repository instead
      };

      // Create service on Render
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `⚙️ Configuring service: ${serviceName}`,
      });

      // Check if service already exists - DELETE AND RECREATE for clean state
      let service: RenderService | undefined;
      
      try {
        const existingServices = await client.listServices();
        console.log(`[Render] Found ${existingServices.length} existing services`);
        
        const existingService = existingServices.find(s => s.name === serviceName);
        
        if (existingService) {
          console.log("[Render] Found existing service - will delete and recreate for clean state");
          
          await ctx.runMutation(internal.deployments.appendLog, {
            deploymentId: args.deploymentId,
            message: `🗑️ Found existing service: ${existingService.id}`,
          });
          
          await ctx.runMutation(internal.deployments.appendLog, {
            deploymentId: args.deploymentId,
            message: `🔥 Deleting existing service to ensure clean configuration...`,
          });
          
          try {
            await client.deleteService(existingService.id);
            console.log(`[Render] Successfully deleted service: ${existingService.id}`);
            
            await ctx.runMutation(internal.deployments.appendLog, {
              deploymentId: args.deploymentId,
              message: `✅ Old service deleted successfully`,
            });
            
            // Wait a moment for Render to process the deletion
            await new Promise(resolve => setTimeout(resolve, 2000));
            
          } catch (deleteError) {
            console.error("[Render] Error deleting service:", deleteError);
            await ctx.runMutation(internal.deployments.appendLog, {
              deploymentId: args.deploymentId,
              message: `⚠️ Could not delete old service, will try to create anyway`,
            });
          }
        }
      } catch (error) {
        console.log("[Render] Could not list services:", error);
      }
      
      // Create fresh new service with correct configuration
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `🆕 Creating fresh service with correct configuration...`,
      });
      
      const createResult = await client.createService(serviceInput);
      service = createResult.service;
      const deployId = createResult.deployId;
      
      console.log("[Render] Service creation response:", JSON.stringify(service, null, 2));
      console.log("[Render] Service ID:", service.id);
      console.log("[Render] Auto-created deploy ID:", deployId);

      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `✅ Service created with ID: ${service.id}`,
      });
      
      // Validate service ID
      if (!service || !service.id) {
        throw new Error("Failed to get valid service ID from Render");
      }

      // For static sites with a repo, Render automatically creates a deployment
      if (deployId) {
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `🔨 Deployment automatically initiated by Render (ID: ${deployId})`,
        });
        
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `⏳ Starting real-time build monitoring...`,
        });
        
        // Start polling for deployment status
        await ctx.scheduler.runAfter(5000, internal.render.liveDeploymentPolling.pollRenderStatus, {
          deploymentId: args.deploymentId,
          renderServiceId: service.id,
          renderDeployId: deployId,
          apiKey: connection.apiKey,
          serviceUrl: service.serviceDetails.url || `https://${service.name}.onrender.com`,
          pollCount: 0,
        });
        
      } else {
        // If no auto-deploy, manually trigger one
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `🔨 Manually triggering deployment...`,
        });

        try {
          const deploy = await client.triggerDeploy(service.id);
          
          await ctx.runMutation(internal.deployments.appendLog, {
            deploymentId: args.deploymentId,
            message: `📡 Deploy initiated (ID: ${deploy.id})`,
          });
          
          await ctx.runMutation(internal.deployments.appendLog, {
            deploymentId: args.deploymentId,
            message: `⏳ Starting real-time build monitoring...`,
          });
          
          // Start polling for deployment status
          await ctx.scheduler.runAfter(5000, internal.render.liveDeploymentPolling.pollRenderStatus, {
            deploymentId: args.deploymentId,
            renderServiceId: service.id,
            renderDeployId: deploy.id,
            apiKey: connection.apiKey,
            serviceUrl: service.serviceDetails.url || `https://${service.name}.onrender.com`,
            pollCount: 0,
          });
          
        } catch (deployError) {
          console.error("[Render] Failed to trigger manual deploy:", deployError);
          // Don't fail the whole deployment - service is created and may auto-deploy
          await ctx.runMutation(internal.deployments.appendLog, {
            deploymentId: args.deploymentId,
            message: `⚠️ Could not manually trigger deploy, but service will auto-deploy from GitHub`,
          });
        }
      }

      if (service.serviceDetails.url) {
        await ctx.runMutation(internal.deployments.appendLog, {
          deploymentId: args.deploymentId,
          message: `🌐 Service URL: ${service.serviceDetails.url}`,
        });
      }
      
      // Store production URL
      if (service.serviceDetails.url) {
        await ctx.runMutation(internal.deployments.updateProductionUrl, {
          deploymentId: args.deploymentId,
          productionUrl: service.serviceDetails.url,
        });
      }
      
      // Keep deployment in "running" state - polling will update when complete
      await ctx.runMutation(internal.deployments.appendLog, {
        deploymentId: args.deploymentId,
        message: `📊 Real-time updates will appear below as build progresses...`,
      });

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
