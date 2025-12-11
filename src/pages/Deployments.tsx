import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";

export default function Deployments() {
  const deployments = useQuery(api.deployments.listAllDeployments, {});

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Deployments</h1>
      <div className="space-y-3">
        {deployments && deployments.length > 0 ? (
          deployments.map((d) => (
            <div
              key={d._id}
              className="flex items-center justify-between bg-slate-900 rounded-lg px-4 py-3"
            >
              <div>
                <div className="text-sm font-medium">
                  {d.provider} – {d.status}
                </div>
                <div className="text-xs text-slate-400">
                  {new Date(d.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">
            No deployments yet. Trigger a deployment from a project to see it here.
          </p>
        )}
      </div>
    </div>
  );
}
