import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useAuth } from "@/hooks/use-auth.ts";
import DeploymentList from "@/features/deployments/DeploymentList.tsx";

export default function Deployments() {
  const deployments = useQuery(api.deployments.listAllDeployments, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Deployments</h1>
        <p className="text-muted-foreground mt-2">
          Track all your deployment activities
        </p>
      </div>

      <DeploymentList deployments={deployments} />
    </div>
  );
}
