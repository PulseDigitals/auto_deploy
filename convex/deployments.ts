import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const listDeploymentsByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    return await ctx.db
      .query("deployments")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .order("desc")
      .collect()
      .catch(async () => {
        // Fallback if index doesn't exist: simple full scan (OK for MVP)
        const all = await ctx.db.query("deployments").order("desc").collect();
        return all.filter((d) => d.projectId === projectId);
      });
  },
});

export const listAllDeployments = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("deployments").order("desc").collect();
  },
});

// Internal query to get deployment by ID
export const getDeploymentById = internalQuery({
  args: { deploymentId: v.id("deployments") },
  handler: async (ctx, { deploymentId }) => {
    return await ctx.db.get(deploymentId);
  },
});

export const createDeployment = mutation({
  args: {
    projectId: v.id("projects"),
    providerId: v.string(), // "vercel" | "netlify" | "render" | "railway" | "aws"
    deploymentMode: v.optional(v.union(v.literal("simulation"), v.literal("live"))), // Default: "simulation"
  },
  handler: async (ctx, { projectId, providerId, deploymentMode }) => {
    // CRITICAL: All deployments flow through the provider registry
    // This is the single source of truth for deployment execution
    
    const identity = await ctx.auth.getUserIdentity();
    const project = await ctx.db.get(projectId);
    
    if (!project) {
      throw new Error("NOT_FOUND: Project not found");
    }

    // Check if user is admin
    let isAdmin = false;
    let user = null;
    if (identity) {
      user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .unique();
      isAdmin = user?.isAdmin ?? false;
    }

    // ADMIN OVERRIDE: Allow live deployment for system projects without plan check
    const isSystemProject = project.isSystemProject ?? false;
    const mode = deploymentMode || "simulation";
    
    // Authorization for live deployment
    if (mode === "live") {
      // System Project + Admin = BYPASS PLAN CHECK
      if (isSystemProject && !isAdmin) {
        throw new Error("FORBIDDEN: Only admins can deploy system projects");
      }
      
      // TEST USER OVERRIDE: Test users have unlimited access
      const isTestUser = user?.isTestUser ?? false;
      
      // For non-system projects, validate subscription plan (unless test user)
      if (!isSystemProject && !isTestUser) {
        if (!user?.subscription) {
          throw new Error("FORBIDDEN: Live deployment requires a subscription");
        }
        
        const userPlan = user.subscription.plan;
        const hasAccess = userPlan === "pro" || userPlan === "team" || userPlan === "enterprise";
        
        if (!hasAccess) {
          throw new Error("FORBIDDEN: Live deployment requires Pro plan or higher");
        }
      }
    }
    
    // Map providerId -> provider name (simple mapping for display)
    const providerNameMap: Record<string, string> = {
      vercel: "Vercel",
      netlify: "Netlify",
      render: "Render",
      railway: "Railway",
      aws: "AWS",
    };

    const provider = providerNameMap[providerId] || "Custom";
    const now = Date.now();

    // Determine if this is a self-deployment
    const isSelfDeployment = isSystemProject && isAdmin;

    const deploymentId = await ctx.db.insert("deployments", {
      projectId,
      userId: user?._id, // Store the user ID who initiated the deployment
      provider,
      providerId,
      deploymentMode: mode,
      targetEnvironment: "production",
      url: undefined,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      logs: isSelfDeployment 
        ? [`[${new Date(now).toISOString()}] System self-deployment initiated by admin (billing bypassed)`]
        : [],
      isSelfDeployment,
      platformVersion: isSelfDeployment ? (project.latestAvailableVersion ?? "v1.0.0") : undefined,
    });

    // Immediately trigger provider-agnostic deployment pipeline
    await ctx.scheduler.runAfter(0, internal.deployments.startDeploymentPipeline, {
      deploymentId,
    });

    return deploymentId;
  },
});

export const updateDeploymentStatus = mutation({
  args: {
    deploymentId: v.id("deployments"),
    status: v.string(),
  },
  handler: async (ctx, { deploymentId, status }) => {
    await ctx.db.patch(deploymentId, { status });
  },
});

// Internal mutation for appending logs (called by scheduler)
export const appendLog = internalMutation({
  args: {
    deploymentId: v.id("deployments"),
    message: v.string(),
  },
  handler: async (ctx, { deploymentId, message }) => {
    const d = await ctx.db.get(deploymentId);
    if (!d) return;

    const newMessage = `[${new Date().toLocaleTimeString()}] ${message}`;

    await ctx.db.patch(deploymentId, {
      logs: [...(d.logs || []), newMessage],
    });
  },
});

// Internal mutation to generate fake build artifacts
export const generateArtifacts = internalMutation({
  args: {
    deploymentId: v.id("deployments"),
  },
  handler: async (ctx, { deploymentId }) => {
    const deployment = await ctx.db.get(deploymentId);
    if (!deployment) return;

    // Generate mock artifacts based on provider
    const artifacts = [
      { path: "dist", type: "folder" },
      {
        path: "dist/index.html",
        type: "file",
        size: 12,
        content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${deployment.provider} Deployment</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/main.js"></script>
  </body>
</html>`,
      },
      { path: "dist/assets", type: "folder" },
      {
        path: "dist/assets/main.js",
        type: "file",
        size: 412,
        content: "/* Main application bundle */\nimport { App } from './App';\nApp.init();",
      },
      { path: "dist/assets/vendor.js", type: "file", size: 213 },
      {
        path: "dist/assets/styles.css",
        type: "file",
        size: 117,
        content: "/* Global styles */\nbody { margin: 0; font-family: sans-serif; }",
      },
    ];

    const buildTime = 1.2 + Math.random() * 0.5; // 1.2-1.7 seconds
    const randomId = Math.random().toString(36).substring(2, 10);
    const previewUrl = `https://${deployment.projectId.slice(0, 8)}-${randomId}.${deployment.providerId || "vercel"}.app`;

    await ctx.db.patch(deploymentId, {
      artifacts,
      buildTime: Math.round(buildTime * 10) / 10,
      previewUrl,
    });
  },
});

// Internal mutation for scheduler to update deployment status and logs
export const updateStatus = internalMutation({
  args: {
    deploymentId: v.id("deployments"),
    status: v.string(),
    log: v.optional(v.string()),
  },
  handler: async (ctx, { deploymentId, status, log }) => {
    const deployment = await ctx.db.get(deploymentId);
    if (!deployment) return;

    await ctx.db.patch(deploymentId, {
      status,
      updatedAt: Date.now(),
      logs: log
        ? [...(deployment.logs || []), log]
        : deployment.logs || [],
    });
  },
});

// Internal mutation to orchestrate full deployment pipeline
// CRITICAL: This is the provider-agnostic execution engine
export const startDeploymentPipeline = internalMutation({
  args: {
    deploymentId: v.id("deployments"),
  },
  handler: async (ctx, { deploymentId }) => {
    const deployment = await ctx.db.get(deploymentId);
    if (!deployment) return;

    const isLiveMode = deployment.deploymentMode === "live";
    const isVercel = deployment.providerId === "vercel";

    // LIVE DEPLOYMENT PATH (Provider-specific executors)
    if (isLiveMode) {
      // Route to provider-specific live executor
      if (isVercel) {
        // Trigger live Vercel deployment
        await ctx.scheduler.runAfter(500, internal.vercel.liveDeployment.executeLiveDeployment, {
          deploymentId,
        });
        return;
      }
      
      if (deployment.providerId === "render") {
        // Trigger live Render deployment
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await ctx.scheduler.runAfter(500, (internal as any)["render/liveDeployment"].executeLiveDeployment, {
          deploymentId,
        });
        return;
      }
      
      // Other providers not yet implemented for live mode
      await ctx.scheduler.runAfter(500, internal.deployments.appendLog, {
        deploymentId,
        message: `Live deployment not yet available for ${deployment.provider}. Please use simulation mode.`,
      });
      await ctx.scheduler.runAfter(1000, internal.deployments.updateStatus, {
        deploymentId,
        status: "failed",
        log: "Live deployment not available for this provider",
      });
      return;
    }

    // SIMULATION DEPLOYMENT PATH (Universal - works for all providers)
    // This is the provider-agnostic simulation engine
    await ctx.scheduler.runAfter(0, internal.deployments.executeSimulationPipeline, {
      deploymentId,
    });
  },
});

// Internal mutation for unified simulation pipeline
export const executeSimulationPipeline = internalMutation({
  args: {
    deploymentId: v.id("deployments"),
  },
  handler: async (ctx, { deploymentId }) => {
    const deployment = await ctx.db.get(deploymentId);
    if (!deployment) return;

    // Determine success (90% success rate)
    const success = Math.random() > 0.1;

    // Step 1: Initial log
    await ctx.scheduler.runAfter(1000, internal.deployments.appendLog, {
      deploymentId,
      message: `Starting ${deployment.provider} deployment simulation…`,
    });

    // Step 2: Transition to running
    await ctx.scheduler.runAfter(2000, internal.deployments.updateStatus, {
      deploymentId,
      status: "running",
      log: "Deployment environment initialized",
    });

    // Step 3: Build logs
    await ctx.scheduler.runAfter(3000, internal.deployments.appendLog, {
      deploymentId,
      message: "Installing dependencies…",
    });

    await ctx.scheduler.runAfter(4000, internal.deployments.appendLog, {
      deploymentId,
      message: "Running build command…",
    });

    await ctx.scheduler.runAfter(5000, internal.deployments.appendLog, {
      deploymentId,
      message: "Uploading build artifacts…",
    });

    // Step 4: Generate artifacts on success
    if (success) {
      await ctx.scheduler.runAfter(6000, internal.deployments.generateArtifacts, {
        deploymentId,
      });

      // Step 5: Generate cost estimate after artifacts
      await ctx.scheduler.runAfter(6500, internal.costEstimation.generateCostEstimate, {
        deploymentId,
      });

      // Step 6: Generate cost optimization advice after cost estimate
      await ctx.scheduler.runAfter(7000, internal.costOptimization.generateOptimizationAdvice, {
        deploymentId,
      });

      // Step 7: Set cost baseline for guardrails
      await ctx.scheduler.runAfter(7500, internal.costGuardrails.setCostBaseline, {
        deploymentId,
      });

      // Step 8: Generate deployment intelligence (Deterministic - Phase 11A)
      await ctx.scheduler.runAfter(8000, internal.deploymentIntelligence.generateDeploymentIntelligence, {
        deploymentId,
      });

      // Step 9: Generate AI insights (Real AI - Phase 12)
      await ctx.scheduler.runAfter(8500, internal.aiInsights.generateAIInsights, {
        deploymentId,
      });
    }

    // Step 10: Final status transition
    await ctx.scheduler.runAfter(9000, internal.deployments.updateStatus, {
      deploymentId,
      status: success ? "success" : "failed",
      log: success
        ? "🟡 Deployment Simulation Successful"
        : "Deployment failed during execution.",
    });

    // Step 11: Update system project if self-deployment succeeded
    if (success) {
      await ctx.scheduler.runAfter(9500, internal.deployments.updateSystemProjectAfterSelfDeploy, {
        deploymentId,
      });
    }
  },
});

// Internal mutation to update system project after successful self-deployment
export const updateSystemProjectAfterSelfDeploy = internalMutation({
  args: {
    deploymentId: v.id("deployments"),
  },
  handler: async (ctx, { deploymentId }) => {
    const deployment = await ctx.db.get(deploymentId);
    if (!deployment) return;

    // Only proceed if this is a self-deployment
    if (!deployment.isSelfDeployment) return;

    // Get the project
    const project = await ctx.db.get(deployment.projectId);
    if (!project || !project.isSystemProject) return;

    // Update the project's current version to the deployed platform version
    await ctx.db.patch(deployment.projectId, {
      currentVersion: deployment.platformVersion,
      lastSelfDeployAt: Date.now(),
    });

    // Mark the release as deployed
    if (deployment.platformVersion) {
      await ctx.scheduler.runAfter(0, internal.platformReleases.markReleaseDeployed, {
        version: deployment.platformVersion,
        deploymentId: deployment._id,
        success: deployment.status === "success",
      });
    }
  },
});

// Internal mutation to update production URL
export const updateProductionUrl = internalMutation({
  args: {
    deploymentId: v.id("deployments"),
    productionUrl: v.string(),
  },
  handler: async (ctx, { deploymentId, productionUrl }) => {
    await ctx.db.patch(deploymentId, {
      productionUrl,
    });
  },
});
