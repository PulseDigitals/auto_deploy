import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api.js";
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

// Mutation to trigger self-deployment (admin-only, uses existing deployment pipeline)
export const triggerSelfDeploy = mutation({
  args: {
    provider: v.string(),
    providerId: v.string(),
    mode: v.union(v.literal("simulation"), v.literal("live")),
  },
  handler: async (ctx, { provider, providerId, mode }) => {
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
