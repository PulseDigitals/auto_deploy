import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useAuth } from "@/hooks/use-auth.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { FolderGit2, Rocket, DollarSign, TrendingUp, FlaskConical } from "lucide-react";

export default function Dashboard() {
  const projects = useQuery(api.projects.listProjectsByUser, {});
  const deployments = useQuery(api.deployments.listAllDeployments, {});
  const currentUser = useQuery(api.users.getCurrentUser, {});

  const isLoading = projects === undefined || deployments === undefined;
  const isTestUser = currentUser?.isTestUser ?? false;

  const stats = [
    {
      title: "Total Projects",
      value: projects?.length || 0,
      icon: FolderGit2,
      color: "text-blue-400",
    },
    {
      title: "Active Deployments",
      value:
        deployments?.filter((d) => d.status === "success").length || 0,
      icon: Rocket,
      color: "text-green-400",
    },
    {
      title: "Cost Savings",
      value: "$2,450",
      icon: DollarSign,
      color: "text-yellow-400",
    },
    {
      title: "Deploy Speed",
      value: "45% faster",
      icon: TrendingUp,
      color: "text-purple-400",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Welcome to 1-Click auto Deploy</h1>
          {isTestUser && (
            <Badge variant="outline" className="border-purple-500 text-purple-500">
              <FlaskConical className="h-3 w-3 mr-1" />
              Test User
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-2">
          Monitor your deployments and manage your projects from one place.
        </p>
        {isTestUser && (
          <div className="mt-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
            <p className="text-sm text-purple-300">
              🎉 You have test user privileges: Unlimited deployments, beta features, and no cost limits!
            </p>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 rounded" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          : stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : deployments && deployments.length > 0 ? (
            <div className="space-y-4">
              {deployments.slice(0, 5).map((deployment: { _id: string; provider: string; createdAt: number; status: string }) => (
                <div
                  key={deployment._id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Rocket className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        Deployment to {deployment.provider}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(deployment.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
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
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No deployments yet. Create a project to get started!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
