import { ConvexError } from "convex/values";
import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Admin-only query to get comprehensive user statistics
 */
export const getUserStatistics = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }

    // Verify caller is an admin
    const caller = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!caller?.isAdmin) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only admins can view user statistics",
      });
    }

    // Get the target user
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Get all projects for this user
    const projects = await ctx.db
      .query("projects")
      .collect();
    
    // Filter projects by checking if userId matches or was created by this user
    const userProjects = projects.filter(p => p.userId === user.tokenIdentifier);

    // Get all deployments
    const allDeployments = await ctx.db
      .query("deployments")
      .collect();

    // Get deployments for user's projects
    const projectIds = userProjects.map(p => p._id);
    const userDeployments = allDeployments.filter(d => 
      projectIds.includes(d.projectId) || d.userId === userId
    );

    // Calculate statistics
    const totalProjects = userProjects.length;
    const totalDeployments = userDeployments.length;
    const successfulDeployments = userDeployments.filter(d => d.status === "success").length;
    const failedDeployments = userDeployments.filter(d => d.status === "failed").length;
    const runningDeployments = userDeployments.filter(d => d.status === "running").length;

    // Calculate activity
    const now = Date.now();
    const lastActiveAt = user.lastActiveAt || user._creationTime;
    const daysSinceActive = Math.floor((now - lastActiveAt) / (1000 * 60 * 60 * 24));
    const isActive = daysSinceActive <= 7;

    // Get recent deployments (last 5)
    const recentDeployments = userDeployments
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);

    // Provider breakdown
    const providerBreakdown = userDeployments.reduce((acc: Record<string, number>, d) => {
      acc[d.provider] = (acc[d.provider] || 0) + 1;
      return acc;
    }, {});

    // Calculate inactivity period
    const inactivityDays = daysSinceActive;
    const inactivityStatus = 
      inactivityDays === 0 ? "Active Today" :
      inactivityDays === 1 ? "Active Yesterday" :
      inactivityDays <= 7 ? `Active ${inactivityDays} days ago` :
      inactivityDays <= 30 ? `Inactive for ${inactivityDays} days` :
      `Inactive for ${Math.floor(inactivityDays / 30)} months`;

    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin ?? false,
        isTestUser: user.isTestUser ?? false,
        subscription: user.subscription,
        location: user.location,
        billingInfo: user.billingInfo,
        lastActiveAt,
        isActive,
        _creationTime: user._creationTime,
      },
      statistics: {
        totalProjects,
        totalDeployments,
        successfulDeployments,
        failedDeployments,
        runningDeployments,
        successRate: totalDeployments > 0 
          ? Math.round((successfulDeployments / totalDeployments) * 100) 
          : 0,
        providerBreakdown,
        inactivityDays,
        inactivityStatus,
      },
      recentDeployments: recentDeployments.map(d => ({
        _id: d._id,
        provider: d.provider,
        status: d.status,
        createdAt: d.createdAt,
        projectId: d.projectId,
      })),
      recentProjects: userProjects
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5)
        .map(p => ({
          _id: p._id,
          name: p.name,
          createdAt: p.createdAt,
          status: p.status,
        })),
    };
  },
});

/**
 * Admin-only query to get all users with aggregated statistics
 */
export const getAllUsersWithStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }

    // Verify caller is an admin
    const caller = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!caller?.isAdmin) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only admins can view all users",
      });
    }

    // Get all users
    const users = await ctx.db.query("users").collect();

    // Get all projects and deployments
    const allProjects = await ctx.db.query("projects").collect();
    const allDeployments = await ctx.db.query("deployments").collect();

    // Build statistics for each user
    const usersWithStats = users.map(user => {
      const userProjects = allProjects.filter(p => p.userId === user.tokenIdentifier);
      const projectIds = userProjects.map(p => p._id);
      const userDeployments = allDeployments.filter(d => 
        projectIds.includes(d.projectId) || d.userId === user._id
      );

      const now = Date.now();
      const lastActiveAt = user.lastActiveAt || user._creationTime;
      const daysSinceActive = Math.floor((now - lastActiveAt) / (1000 * 60 * 60 * 24));
      const isActive = daysSinceActive <= 7;

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin ?? false,
        isTestUser: user.isTestUser ?? false,
        subscription: user.subscription,
        location: user.location,
        billingInfo: user.billingInfo,
        lastActiveAt,
        isActive,
        daysSinceActive,
        totalProjects: userProjects.length,
        totalDeployments: userDeployments.length,
        successfulDeployments: userDeployments.filter(d => d.status === "success").length,
        _creationTime: user._creationTime,
      };
    });

    // Sort by most recent activity
    return usersWithStats.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
  },
});
