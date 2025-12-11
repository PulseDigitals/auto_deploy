import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ArrowLeft, Rocket, Globe, GitBranch, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = id as Id<"projects">;
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const project = useQuery(api.projects.getProject, { projectId });
  const deployments = useQuery(api.deployments.listDeploymentsByProject, {
    projectId,
  });
  const domains = useQuery(api.domains.listDomainsByProject, { projectId });
  const manifest = useQuery(api.manifests.getManifestByProject, { projectId });

  const createDeployment = useMutation(api.deployments.createDeployment);
  const analyzeCodebase = useAction(api.analyzeCodebase.analyzeCodebase);

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

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      await analyzeCodebase({ projectId });
      toast.success("AI analysis complete!");
    } catch (error) {
      toast.error("Failed to analyze codebase");
      console.error(error);
    } finally {
      setIsAnalyzing(false);
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

  if (!project) {
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
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold">Project not found</h1>
        </div>
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
            {!manifest ? (
              <>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    AI-powered manifest generation will automatically detect
                    your framework, configure build settings, and recommend the
                    best deployment strategy.
                  </p>
                </div>
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="w-full gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Analyze with AI
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-400">
                    ✓ Analysis Complete
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                  >
                    Re-analyze
                  </Button>
                </div>
              </div>
            )}
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
                {domains.map((domain: { _id: string; domain: string; status: string }) => (
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

      {/* Manifest Display */}
      {manifest && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              Deployment Manifest
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-slate-900 p-4 rounded-lg overflow-auto text-slate-300 text-sm max-h-96">
              {JSON.stringify(manifest.manifest, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

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
              {deployments.map((deployment: { _id: string; provider: string; createdAt: number; status: string }) => (
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
