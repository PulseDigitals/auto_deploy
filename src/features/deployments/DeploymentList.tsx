import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";
import { Rocket } from "lucide-react";

interface DeploymentListProps {
  deployments: Doc<"deployments">[] | undefined;
}

export default function DeploymentList({ deployments }: DeploymentListProps) {
  if (deployments === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Deployments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (deployments.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Rocket />
          </EmptyMedia>
          <EmptyTitle>No deployments yet</EmptyTitle>
          <EmptyDescription>
            Deploy your first project to see it here
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Deployments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {deployments.map((deployment) => (
          <div
            key={deployment._id}
            className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-4">
              <Rocket className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{deployment.provider}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(deployment.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            <span
              className={`text-xs px-3 py-1 rounded-full font-medium ${
                deployment.status === "success"
                  ? "bg-green-500/10 text-green-400"
                  : deployment.status === "failed"
                    ? "bg-red-500/10 text-red-400"
                    : deployment.status === "running"
                      ? "bg-blue-500/10 text-blue-400"
                      : "bg-yellow-500/10 text-yellow-400"
              }`}
            >
              {deployment.status}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
