import { query, mutation, internalMutation } from "./_generated/server";
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

export const createDeployment = mutation({
  args: {
    projectId: v.id("projects"),
    providerId: v.string(), // "vercel" | "netlify" | "render" | "railway" | "aws"
  },
  handler: async (ctx, { projectId, providerId }) => {
    // Map providerId -> provider name (simple mapping for backend safety)
    const providerNameMap: Record<string, string> = {
      vercel: "Vercel",
      netlify: "Netlify",
      render: "Render",
      railway: "Railway",
      aws: "AWS",
    };

    const provider = providerNameMap[providerId] || "Custom";

    const now = Date.now();

    const deploymentId = await ctx.db.insert("deployments", {
      projectId,
      provider,
      providerId,
      targetEnvironment: "production",
      url: undefined,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      logs: [],
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
