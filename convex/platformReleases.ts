import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.d.ts";
import { v } from "convex/values";

// Query to get release automation status (admin-only)
export const getReleaseAutomationStatus = query({
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

    // Get recent releases (last 10)
    const recentReleases = await ctx.db
      .query("platformReleases")
      .withIndex("by_detectedAt")
      .order("desc")
      .take(10);

    return {
      currentVersion,
      latestAvailableVersion,
      updateAvailable,
      autoDeployOnRelease: systemProject.autoDeployOnRelease ?? false,
      releaseChannel: systemProject.releaseChannel ?? "stable",
      releaseSource: systemProject.releaseSource ?? "manual",
      lastReleaseCheckAt: systemProject.lastReleaseCheckAt,
      lastDetectedReleaseVersion: systemProject.lastDetectedReleaseVersion,
      recentReleases,
    };
  },
});

// Mutation to set release automation settings (admin-only)
export const setReleaseAutomationSettings = mutation({
  args: {
    autoDeployOnRelease: v.boolean(),
    releaseChannel: v.union(v.literal("stable"), v.literal("beta")),
    releaseSource: v.union(v.literal("manual"), v.literal("github")),
  },
  handler: async (ctx, { autoDeployOnRelease, releaseChannel, releaseSource }) => {
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

    // Update automation settings
    await ctx.db.patch(systemProject._id, {
      autoDeployOnRelease,
      releaseChannel,
      releaseSource,
    });

    return { success: true };
  },
});

// Mutation to simulate a new release (admin-only)
export const simulateNewRelease = mutation({
  args: {
    version: v.string(),
    notes: v.optional(v.string()),
    channel: v.optional(v.union(v.literal("stable"), v.literal("beta"))),
  },
  handler: async (ctx, { version, notes, channel }): Promise<{ success: boolean; status: string; deploymentId?: string }> => {
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

    const now = Date.now();
    const releaseChannel = channel ?? systemProject.releaseChannel ?? "stable";

    // Insert release record
    const releaseId = await ctx.db.insert("platformReleases", {
      version,
      channel: releaseChannel,
      source: "manual",
      notes,
      detectedAt: now,
      detectedByUserId: user._id,
      status: "detected",
    });

    // Update system project
    await ctx.db.patch(systemProject._id, {
      latestAvailableVersion: version,
      lastDetectedReleaseVersion: version,
      lastReleaseDetectedAt: now,
      releaseNotes: notes,
    });

    // Check if auto-deploy is enabled
    const autoDeployEnabled = systemProject.autoDeployOnRelease ?? false;

    if (autoDeployEnabled) {
      // Trigger self-deployment
      const deploymentResult: { deploymentId: Id<"deployments">; systemProjectId: Id<"projects"> } = await ctx.runMutation(internal.projects._internalTriggerSelfDeploy, {
        provider: "Vercel",
        providerId: "vercel",
        mode: "simulation",
      });

      // Update release status to queued
      await ctx.db.patch(releaseId, {
        status: "queued",
        deploymentId: deploymentResult.deploymentId,
      });

      return { success: true, status: "queued", deploymentId: deploymentResult.deploymentId as string };
    } else {
      // Auto-deploy not enabled, mark as skipped
      await ctx.db.patch(releaseId, {
        status: "skipped",
      });

      return { success: true, status: "skipped" };
    }
  },
});

// Internal mutation to mark release as deployed (called after successful self-deployment)
export const markReleaseDeployed = internalMutation({
  args: {
    version: v.string(),
    deploymentId: v.id("deployments"),
    success: v.boolean(),
  },
  handler: async (ctx, { version, deploymentId, success }) => {
    // Find the latest release with this version
    const release = await ctx.db
      .query("platformReleases")
      .withIndex("by_version", (q) => q.eq("version", version))
      .order("desc")
      .first();

    if (!release) {
      // No release found, this is fine (might be a manual deployment)
      return;
    }

    // Update release status
    await ctx.db.patch(release._id, {
      status: success ? "deployed" : "failed",
      deploymentId,
    });
  },
});

// Mutation to manually check for releases (admin-only)
export const checkForReleases = mutation({
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

    // Get the system project
    const systemProject = await ctx.db
      .query("projects")
      .filter((q) => q.eq(q.field("isSystemProject"), true))
      .first();

    if (!systemProject) {
      throw new Error("NOT_FOUND: System project not found. Please initialize it first.");
    }

    const now = Date.now();

    // Update last check time
    await ctx.db.patch(systemProject._id, {
      lastReleaseCheckAt: now,
    });

    // If source is GitHub, this would poll the repository
    // For now, just update the timestamp
    const releaseSource = systemProject.releaseSource ?? "manual";

    if (releaseSource === "github") {
      // Placeholder for future GitHub polling
      // TODO: Implement GitHub API polling here
      // For now, just log the check
      return {
        success: true,
        message: "Release check completed (GitHub polling stub)",
        lastCheckAt: now,
      };
    }

    return {
      success: true,
      message: "Release check completed (manual mode)",
      lastCheckAt: now,
    };
  },
});

// Internal scheduled job: releaseChecker (stub for future automation)
export const releaseChecker = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get the system project
    const systemProject = await ctx.db
      .query("projects")
      .filter((q) => q.eq(q.field("isSystemProject"), true))
      .first();

    if (!systemProject) {
      // No system project, nothing to do
      return;
    }

    const now = Date.now();
    const releaseSource = systemProject.releaseSource ?? "manual";

    // Update last check time
    await ctx.db.patch(systemProject._id, {
      lastReleaseCheckAt: now,
    });

    // If manual mode, do nothing
    if (releaseSource === "manual") {
      return;
    }

    // If GitHub mode, this is where we would poll the repository
    if (releaseSource === "github") {
      // Placeholder for future GitHub polling
      // TODO: Implement GitHub API polling here
      // Structure:
      // 1. Read systemProject.repositoryUrl
      // 2. Call GitHub API to get latest release
      // 3. Compare with systemProject.latestAvailableVersion
      // 4. If different, call simulateNewRelease internally
      return;
    }
  },
});
