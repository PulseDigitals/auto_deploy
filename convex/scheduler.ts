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
        await ctx.scheduler.runAfter(2000, internal.deployments.updateStatus, {
          deploymentId: d._id,
          status: "running",
          log: "Deployment started…",
        });
      } else if (d.status === "running") {
        const success = Math.random() > 0.1; // 90% success rate

        await ctx.scheduler.runAfter(2000, internal.deployments.updateStatus, {
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
