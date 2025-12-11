import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const tick = internalMutation({
  args: {},
  handler: async (ctx) => {
    const deployments = await ctx.db
      .query("deployments")
      .collect();

    const activeDeployments = deployments.filter(
      (d) => d.status === "pending" || d.status === "running"
    );

    for (const d of activeDeployments) {
      if (d.status === "pending") {
        // Append initial log
        await ctx.scheduler.runAfter(1000, internal.deployments.appendLog, {
          deploymentId: d._id,
          message: "Starting deployment…",
        });

        // Transition to running
        await ctx.scheduler.runAfter(2000, internal.deployments.updateStatus, {
          deploymentId: d._id,
          status: "running",
          log: "Deployment environment initialized",
        });
      } else if (d.status === "running") {
        const success = Math.random() > 0.1; // 90% success rate

        // Generate progressive logs during running phase
        await ctx.scheduler.runAfter(2000, internal.deployments.appendLog, {
          deploymentId: d._id,
          message: "Installing dependencies…",
        });

        await ctx.scheduler.runAfter(3000, internal.deployments.appendLog, {
          deploymentId: d._id,
          message: "Running build command…",
        });

        await ctx.scheduler.runAfter(4000, internal.deployments.appendLog, {
          deploymentId: d._id,
          message: "Uploading build artifacts…",
        });

        // Final status transition with completion log
        await ctx.scheduler.runAfter(5000, internal.deployments.updateStatus, {
          deploymentId: d._id,
          status: success ? "success" : "failed",
          log: success
            ? "Deployment completed successfully."
            : "Deployment failed during execution.",
        });
      }
    }
  },
});
