import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState } from "react";
import DeploymentLogModal from "@/components/DeploymentLogModal.tsx";
import { Rocket } from "lucide-react";

type Deployment = {
  _id: string;
  provider: string;
  deploymentMode?: "simulation" | "live"; // Optional for backward compatibility
  status: string;
  createdAt: number;
  logs?: string[];
  platformVersion?: string;
  isSelfDeployment?: boolean;
};

export default function Deployments() {
  const deployments = useQuery(api.deployments.listAllDeployments, {});
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Deployments</h1>
      <div className="space-y-3">
        {deployments && deployments.length > 0 ? (
          deployments.map((d) => (
            <div
              key={d._id}
              onClick={() => setSelectedDeployment(d as Deployment)}
              className="cursor-pointer hover:bg-slate-800 transition flex items-center justify-between bg-slate-900 rounded-lg px-4 py-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {d.provider} – {d.status}
                  </span>
                  {d.isSelfDeployment && (
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-500/20 text-amber-300 flex items-center gap-1">
                      <Rocket className="h-2.5 w-2.5" />
                      Self Deployment
                    </span>
                  )}
                  {d.platformVersion && (
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-purple-500/20 text-purple-300 font-mono">
                      {d.platformVersion}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400">
                  {new Date(d.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-1 text-[10px] rounded-full bg-slate-800 text-slate-200">
                  {d.provider}
                </span>
                <span
                  className={`px-2 py-1 text-[10px] rounded-full ${
                    d.deploymentMode === "live"
                      ? "bg-green-500/20 text-green-300"
                      : "bg-yellow-500/20 text-yellow-300"
                  }`}
                  title={
                    d.deploymentMode === "live"
                      ? "Real infrastructure created on provider"
                      : "No real infrastructure created"
                  }
                >
                  {d.deploymentMode === "live" ? "🟢 Live" : "🟡 Simulation"}
                </span>
                <span
                  className={`px-2 py-1 text-[10px] rounded-full ${
                    d.status === "success"
                      ? "bg-green-500/20 text-green-300"
                      : d.status === "failed"
                      ? "bg-red-500/20 text-red-300"
                      : d.status === "running"
                      ? "bg-blue-500/20 text-blue-300"
                      : "bg-yellow-500/20 text-yellow-300"
                  }`}
                >
                  {d.status}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">
            No deployments yet. Trigger a deployment from a project to see it here.
          </p>
        )}
      </div>

      {selectedDeployment && (
        <DeploymentLogModal
          deployment={selectedDeployment}
          onClose={() => setSelectedDeployment(null)}
        />
      )}
    </div>
  );
}
