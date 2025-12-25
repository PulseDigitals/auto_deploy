import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.d.ts";
import { v } from "convex/values";

export const listProjectsByUser = query({
  args: {},
  handler: async (ctx) => {
    // Get current user to check admin status
    const identity = await ctx.auth.getUserIdentity();
    let isAdmin = false;
    
    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .unique();
      isAdmin = user?.isAdmin ?? false;
    }

    // If admin, return all projects including system projects
    // If not admin, return only user projects (exclude system projects)
    const allProjects = await ctx.db.query("projects").order("desc").collect();
    
    if (isAdmin) {
      return allProjects;
    }
    
    return allProjects.filter(p => !p.isSystemProject);
  },
});

export const getProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    return await ctx.db.get(projectId);
  },
});

// Internal helper used by actions
export const getProjectInternal = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    return await ctx.db.get(projectId);
  },
});

// Internal query to get project by ID (for use in actions)
export const getProjectById = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    return await ctx.db.get(projectId);
  },
});

export const createProject = mutation({
  args: {
    name: v.string(),
    gitRepoUrl: v.optional(v.string()),
  },
  handler: async (ctx, { name, gitRepoUrl }) => {
    const now = Date.now();
    const id = await ctx.db.insert("projects", {
      name,
      gitRepoUrl: gitRepoUrl ?? undefined,
      createdAt: now,
      status: "new",
    });
    return id;
  },
});

export const updateProjectStatus = mutation({
  args: { projectId: v.id("projects"), status: v.string() },
  handler: async (ctx, { projectId, status }) => {
    await ctx.db.patch(projectId, { status });
  },
});

// Internal mutation to seed system project (idempotent)
export const seedSystemProject = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if system project already exists
    const existingSystemProject = await ctx.db
      .query("projects")
      .filter((q) => q.eq(q.field("isSystemProject"), true))
      .first();

    if (existingSystemProject) {
      // Already seeded, do nothing
      return existingSystemProject._id;
    }

    // Create the system project with initial version
    const now = Date.now();
    const initialVersion = "v1.0.0";
    const systemProjectId = await ctx.db.insert("projects", {
      name: "ai-deploy-agent-core",
      description: "Internal system project for self-deployment",
      gitRepoUrl: undefined,
      createdAt: now,
      status: "analyzed",
      isSystemProject: true,
      visibility: "system",
      createdByRole: "admin",
      providerPreference: "vercel",
      environment: "production",
      currentVersion: initialVersion,
      latestAvailableVersion: initialVersion,
      repositoryUrl: "https://github.com/your-org/ai-deploy-agent",
      autoDeployEnabled: false,
    });

    return systemProjectId;
  },
});

// Public mutation to trigger system project seeding (admin-only)
export const initializeSystemProject = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("UNAUTHENTICATED: User not logged in");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user?.isAdmin) {
      throw new Error("FORBIDDEN: Admin access required");
    }

    // Run internal seeding
    await ctx.scheduler.runAfter(0, internal.projects.seedSystemProject);
    return { success: true };
  },
});

// Query to get the system project (admin-only)
export const getSystemProject = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user?.isAdmin) {
      return null;
    }

    // Get the system project
    const systemProject = await ctx.db
      .query("projects")
      .filter((q) => q.eq(q.field("isSystemProject"), true))
      .first();

    return systemProject;
  },
});

// Query to get platform version information (admin-only)
export const getPlatformVersion = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user?.isAdmin) {
      return null;
    }

    // Get the system project
    const systemProject = await ctx.db
      .query("projects")
      .filter((q) => q.eq(q.field("isSystemProject"), true))
      .first();

    if (!systemProject) {
      return null;
    }

    const currentVersion = systemProject.currentVersion ?? "v1.0.0";
    const latestAvailableVersion = systemProject.latestAvailableVersion ?? "v1.0.0";
    const updateAvailable = currentVersion !== latestAvailableVersion;

    return {
      currentVersion,
      latestAvailableVersion,
      updateAvailable,
      lastSelfDeployAt: systemProject.lastSelfDeployAt,
    };
  },
});

// Mutation to set latest platform version (admin-only, for simulating releases)
export const setLatestPlatformVersion = mutation({
  args: { version: v.string() },
  handler: async (ctx, { version }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("UNAUTHENTICATED: User not logged in");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user?.isAdmin) {
      throw new Error("FORBIDDEN: Admin access required");
    }

    // Get the system project
    const systemProject = await ctx.db
      .query("projects")
      .filter((q) => q.eq(q.field("isSystemProject"), true))
      .first();

    if (!systemProject) {
      throw new Error("NOT_FOUND: System project not found. Please initialize it first.");
    }

    // Update latest available version
    await ctx.db.patch(systemProject._id, {
      latestAvailableVersion: version,
    });

    return { success: true, version };
  },
});

// Internal mutation to trigger self-deployment (can be called from other mutations)
export const _internalTriggerSelfDeploy = internalMutation({
  args: {
    provider: v.string(),
    providerId: v.string(),
    mode: v.union(v.literal("simulation"), v.literal("live")),
  },
  handler: async (ctx, { provider, providerId, mode }): Promise<{ deploymentId: Id<"deployments">; systemProjectId: Id<"projects"> }> => {
    // Get the system project
    const systemProject = await ctx.db
      .query("projects")
      .filter((q) => q.eq(q.field("isSystemProject"), true))
      .first();

    if (!systemProject) {
      throw new Error("NOT_FOUND: System project not found. Please initialize it first.");
    }

    const latestVersion = systemProject.latestAvailableVersion ?? "v1.0.0";

    // Create a deployment using the existing pipeline
    const now = Date.now();
    const deploymentId = await ctx.db.insert("deployments", {
      projectId: systemProject._id,
      provider,
      providerId,
      deploymentMode: mode,
      targetEnvironment: systemProject.environment ?? "production",
      createdAt: now,
      updatedAt: now,
      status: "pending",
      logs: [`[${new Date(now).toISOString()}] Self-deployment initiated for ${latestVersion}`],
      platformVersion: latestVersion,
      isSelfDeployment: true,
    });

    // Schedule the deployment status updates using existing pattern
    await ctx.scheduler.runAfter(0, internal.deployments.updateStatus, {
      deploymentId,
      status: "running",
      log: `[${new Date(now).toISOString()}] Deployment pipeline started`,
    });

    return { deploymentId, systemProjectId: systemProject._id };
  },
});

// Mutation to trigger self-deployment (admin-only, uses existing deployment pipeline)
export const triggerSelfDeploy = mutation({
  args: {
    provider: v.string(),
    providerId: v.string(),
    mode: v.union(v.literal("simulation"), v.literal("live")),
  },
  handler: async (ctx, { provider, providerId, mode }): Promise<{ deploymentId: Id<"deployments">; systemProjectId: Id<"projects"> }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("UNAUTHENTICATED: User not logged in");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user?.isAdmin) {
      throw new Error("FORBIDDEN: Admin access required");
    }

    // Call internal version
    return await ctx.runMutation(internal.projects._internalTriggerSelfDeploy, {
      provider,
      providerId,
      mode,
    });
  },
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PHASE R1: RENDER SERVICE PERSISTENCE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Internal mutation to store Render service information
export const storeRenderServiceInfo = internalMutation({
  args: {
    projectId: v.id("projects"),
    renderServiceId: v.string(),
    renderServiceUrl: v.string(),
    renderAuthCallbackPath: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const callbackPath = args.renderAuthCallbackPath || "/auth/callback";
    const redirectUri = `${args.renderServiceUrl}${callbackPath}`;
    
    await ctx.db.patch(args.projectId, {
      renderServiceId: args.renderServiceId,
      renderServiceUrl: args.renderServiceUrl,
      renderAuthCallbackPath: callbackPath,
      renderRedirectUri: redirectUri,
      renderAuthStatus: "needs_setup",
      renderAuthLastCheckedAt: Date.now(),
    });
  },
});

// Query to get Render auth status for a project
export const getRenderAuthStatus = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }): Promise<{
    status: "unknown" | "needs_setup" | "verified" | "failed";
    redirectUri?: string;
    serviceUrl?: string;
    lastCheckedAt?: number;
  }> => {
    const project = await ctx.db.get(projectId);
    if (!project) {
      return { status: "unknown" };
    }
    
    return {
      status: project.renderAuthStatus || "unknown",
      redirectUri: project.renderRedirectUri,
      serviceUrl: project.renderServiceUrl,
      lastCheckedAt: project.renderAuthLastCheckedAt,
    };
  },
});

// Mutation to verify Render redirect URI configuration
export const verifyRenderAuth = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }): Promise<{
    success: boolean;
    status: "verified" | "failed";
    message: string;
  }> => {
    const project = await ctx.db.get(projectId);
    if (!project || !project.renderServiceUrl) {
      return {
        success: false,
        status: "failed",
        message: "No Render service URL found. Please deploy first.",
      };
    }
    
    try {
      // Verification Strategy A: Test the callback URL
      const callbackPath = project.renderAuthCallbackPath || "/auth/callback";
      const testUrl = `${project.renderServiceUrl}${callbackPath}?test=1`;
      
      const response = await fetch(testUrl, {
        method: "GET",
        redirect: "manual", // Don't follow redirects
      });
      
      // Check if the response is NOT a "redirect_uri mismatch" error
      // A successful response or redirect indicates proper configuration
      const isAccessible = response.status !== 404;
      
      if (isAccessible) {
        await ctx.db.patch(projectId, {
          renderAuthStatus: "verified",
          renderAuthLastCheckedAt: Date.now(),
        });
        
        return {
          success: true,
          status: "verified",
          message: "✅ Auth callback is accessible! Sign-in should work.",
        };
      } else {
        await ctx.db.patch(projectId, {
          renderAuthStatus: "failed",
          renderAuthLastCheckedAt: Date.now(),
        });
        
        return {
          success: false,
          status: "failed",
          message: "❌ Callback returns 404. Please register the redirect URI in Hercules Auth settings.",
        };
      }
    } catch (error) {
      await ctx.db.patch(projectId, {
        renderAuthStatus: "failed",
        renderAuthLastCheckedAt: Date.now(),
      });
      
      return {
        success: false,
        status: "failed",
        message: `❌ Verification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});
