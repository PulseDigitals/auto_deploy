import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ArrowLeft, Rocket, Globe, GitBranch, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = id as Id<"projects">;

  const project = useQuery(api.projects.getProject, { projectId });
  const deployments = useQuery(api.deployments.listDeploymentsByProject, {
    projectId,
  });
  const domains = useQuery(api.domains.listDomainsByProject, { projectId });

  const createDeployment = useMutation(api.deployments.createDeployment);

  const handleDeploy = async () => {
    try {
      await createDeployment({
        projectId,
        provider: "AWS",
      });
      toast.success("Deployment initiated!");
    } catch (error) {
      toast.error("Failed to create deployment");
    }
  };

  if (project === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/dashboard/projects">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          {project.gitRepoUrl && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <GitBranch className="h-4 w-4" />
              <a
                href={project.gitRepoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {project.gitRepoUrl}
              </a>
            </div>
          )}
        </div>
        <Button onClick={handleDeploy} className="gap-2">
          <Rocket className="h-4 w-4" />
          Deploy Now
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* AI Analysis Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                AI-powered manifest generation and deployment optimization
                coming soon. This will automatically detect your framework,
                configure build settings, and recommend the best deployment
                strategy.
              </p>
            </div>
            <Button variant="outline" disabled className="w-full gap-2">
              <Sparkles className="h-4 w-4" />
              Analyze & Deploy with AI
            </Button>
          </CardContent>
        </Card>

        {/* Domains Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Domains
            </CardTitle>
          </CardHeader>
          <CardContent>
            {domains === undefined ? (
              <Skeleton className="h-20 w-full" />
            ) : domains.length > 0 ? (
              <div className="space-y-2">
                {domains.map((domain) => (
                  <div
                    key={domain._id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded"
                  >
                    <span className="text-sm">{domain.domain}</span>
                    <span className="text-xs text-muted-foreground">
                      {domain.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No domains yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Deployments */}
      <Card>
        <CardHeader>
          <CardTitle>Deployment History</CardTitle>
        </CardHeader>
        <CardContent>
          {deployments === undefined ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : deployments.length > 0 ? (
            <div className="space-y-3">
              {deployments.map((deployment) => (
                <div
                  key={deployment._id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {deployment.provider}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(deployment.createdAt).toLocaleString()}
                    </p>
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
              No deployments yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
