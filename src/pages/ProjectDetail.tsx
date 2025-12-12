import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Input } from "@/components/ui/input.tsx";
import { ArrowLeft, Rocket, Globe, GitBranch, Sparkles, Loader2, Package, ExternalLink, DollarSign, TrendingDown, Lightbulb, CheckCircle2, Shield, AlertTriangle, AlertCircle, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import ProviderSelector from "@/components/ProviderSelector.tsx";
import ProviderInstructions from "@/components/ProviderInstructions.tsx";
import DeploymentLogModal from "@/components/DeploymentLogModal.tsx";
import ArtifactExplorer from "@/components/ArtifactExplorer.tsx";
import type { ProviderId } from "@/config/providers.ts";
import { getProviderConfig } from "@/config/providers.ts";

type Artifact = {
  path: string;
  type: string;
  content?: string;
  size?: number;
};

type CostEstimate = {
  monthlyTotal: number;
  compute: number;
  bandwidth: number;
  storage: number;
  currency: string;
  assumptions: string;
};

type CostComparison = {
  provider: string;
  monthlyCost: number;
};

type CostAdvisor = {
  recommendation: string;
  recommendedProvider: string;
  monthlySavings: number;
  reasoning: string[];
  confidenceScore: number;
};

type CostAlerts = {
  thresholdPercent: number;
  triggered: boolean;
  lastCheckedAt: number;
};

type CostDrift = {
  currentEstimate: number;
  percentIncrease: number;
  status: string; // "normal" | "warning" | "critical"
};

type Deployment = {
  _id: string;
  provider: string;
  providerId?: string;
  status: string;
  createdAt: number;
  logs?: string[];
  artifacts?: Artifact[];
  buildTime?: number;
  previewUrl?: string;
  estimatedCost?: CostEstimate;
  costComparison?: CostComparison[];
  costAdvisor?: CostAdvisor;
  costBaseline?: number;
  costAlerts?: CostAlerts;
  costDrift?: CostDrift;
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = id as Id<"projects">;
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>("vercel");
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [newDomain, setNewDomain] = useState("");

  const project = useQuery(api.projects.getProject, { projectId });
  const deployments = useQuery(api.deployments.listDeploymentsByProject, {
    projectId,
  });
  const domains = useQuery(api.domains.listDomainsByProject, { projectId });
  const manifest = useQuery(api.manifests.getManifestByProject, { projectId });

  const createDeployment = useMutation(api.deployments.createDeployment);
  const analyzeCodebase = useAction(api.analyzeCodebase.analyzeCodebase);
  const addDomain = useMutation(api.domains.addDomain);
  const updateDomainStatus = useMutation(api.domains.updateDomainStatus);
  const simulateCostDrift = useMutation(api.costGuardrailsPublic.simulateCostDrift);

  const handleDeploy = async () => {
    if (!project) return;
    try {
      setIsDeploying(true);
      await createDeployment({
        projectId,
        providerId: selectedProvider,
      });
      toast.success("Deployment initiated!");
    } catch (error) {
      toast.error("Failed to create deployment");
    } finally {
      setIsDeploying(false);
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

  const handleAddDomain = async () => {
    if (!newDomain.trim()) {
      toast.error("Please enter a domain name");
      return;
    }

    try {
      const domainId = await addDomain({
        projectId,
        domain: newDomain.trim(),
      });

      toast.success(`Domain ${newDomain} added!`);
      setNewDomain("");

      // Simulate domain status transitions
      setTimeout(async () => {
        await updateDomainStatus({ domainId, status: "verifying" });
      }, 3000);

      setTimeout(async () => {
        await updateDomainStatus({ domainId, status: "active" });
        toast.success(`Domain ${newDomain} is now active!`);
      }, 6000);
    } catch (error) {
      toast.error("Failed to add domain");
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

      <div>
        <div className="flex items-start justify-between mb-6">
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
        </div>

        {/* Provider Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              Deploy Project
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProviderSelector
              value={selectedProvider}
              onChange={setSelectedProvider}
            />
            <Button 
              onClick={handleDeploy} 
              disabled={isDeploying} 
              className="w-full gap-2"
            >
              <Rocket className="h-4 w-4" />
              {isDeploying ? "Deploying..." : "Deploy Now"}
            </Button>
            <ProviderInstructions providerId={selectedProvider} />
          </CardContent>
        </Card>
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
              Custom Domains
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="example.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
              />
              <Button onClick={handleAddDomain} size="sm">
                Add Domain
              </Button>
            </div>

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
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        domain.status === "active"
                          ? "bg-green-500/20 text-green-300"
                          : domain.status === "verifying"
                          ? "bg-blue-500/20 text-blue-300"
                          : "bg-yellow-500/20 text-yellow-300"
                      }`}
                    >
                      {domain.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No custom domains configured
              </p>
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

      {/* Latest Deployment Summary */}
      {deployments && deployments.length > 0 && deployments[0].status === "success" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-400" />
              Latest Deployment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="text-sm">
                  ✔ Build completed in{" "}
                  <span className="font-semibold">{deployments[0].buildTime || "1.3"}s</span>
                </div>
                <div className="text-sm">
                  ✔{" "}
                  <span className="font-semibold">
                    {deployments[0].artifacts?.length || 0} artifacts
                  </span>{" "}
                  generated
                </div>
                {deployments[0].previewUrl && (
                  <div className="text-sm flex items-center gap-2">
                    ✔ Preview URL:
                    <a
                      href={deployments[0].previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline flex items-center gap-1"
                    >
                      {deployments[0].previewUrl.replace("https://", "")}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug View - Temporary */}
      {deployments && deployments.length > 0 && deployments[0].status === "success" && (
        <Card className="border-dashed border-yellow-500/30 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="text-sm text-yellow-400">Debug: Deployment Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs opacity-70 overflow-auto max-h-48">
              {JSON.stringify(
                {
                  status: deployments[0].status,
                  hasEstimatedCost: !!deployments[0].estimatedCost,
                  estimatedCost: deployments[0].estimatedCost,
                  hasCostComparison: !!deployments[0].costComparison,
                  costComparison: deployments[0].costComparison,
                  hasCostAdvisor: !!deployments[0].costAdvisor,
                  costAdvisor: deployments[0].costAdvisor,
                  costBaseline: deployments[0].costBaseline,
                  costAlerts: deployments[0].costAlerts,
                  costDrift: deployments[0].costDrift,
                },
                null,
                2
              )}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Cost Estimation */}
      {deployments && deployments.length > 0 && deployments[0].status === "success" && deployments[0].estimatedCost && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Cost Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-400" />
                Estimated Monthly Cost
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-3xl font-bold">
                  ${deployments[0].estimatedCost.monthlyTotal}
                  <span className="text-sm text-muted-foreground font-normal"> / month</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {deployments[0].estimatedCost.assumptions}
                </p>
              </div>

              <div className="space-y-3">
                {/* Compute Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>Compute</span>
                    <span className="font-semibold">${deployments[0].estimatedCost.compute}</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{
                        width: `${(deployments[0].estimatedCost.compute / deployments[0].estimatedCost.monthlyTotal) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Bandwidth Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>Bandwidth</span>
                    <span className="font-semibold">${deployments[0].estimatedCost.bandwidth}</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500"
                      style={{
                        width: `${(deployments[0].estimatedCost.bandwidth / deployments[0].estimatedCost.monthlyTotal) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Storage Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>Storage</span>
                    <span className="font-semibold">${deployments[0].estimatedCost.storage}</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{
                        width: `${(deployments[0].estimatedCost.storage / deployments[0].estimatedCost.monthlyTotal) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <p className="text-xs text-muted-foreground">
                  Costs shown are estimates, not bills. You can change providers anytime.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Provider Comparison & Savings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-green-400" />
                Cost Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Provider Comparison Table */}
              {deployments[0].costComparison && (
                <div className="space-y-2">
                  <div className="text-sm font-medium mb-3">Provider Cost Comparison</div>
                  <div className="space-y-2">
                    {deployments[0].costComparison.map((item, index) => {
                      const isCheapest = index === 0;
                      const isSelected = item.provider === deployments[0].providerId;
                      const providerConfig = getProviderConfig(item.provider);
                      
                      return (
                        <div
                          key={item.provider}
                          className={`flex items-center justify-between p-2 rounded-lg ${
                            isSelected ? "bg-slate-800 border border-slate-700" : "bg-slate-900/50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm capitalize">
                              {providerConfig?.name || item.provider}
                            </span>
                            {isCheapest && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-300">
                                Cheapest
                              </span>
                            )}
                            {isSelected && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                                Selected
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-semibold">${item.monthlyCost}/mo</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Savings Section */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="text-sm font-medium">Cost Savings vs Vibe Platforms</div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <div className="space-y-0.5">
                      <div className="text-xs text-muted-foreground">vs Replit Teams</div>
                      <div className="text-lg font-bold text-green-400">
                        ${80 - deployments[0].estimatedCost.monthlyTotal}/mo saved
                      </div>
                    </div>
                    <div className="text-2xl">📉</div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <div className="space-y-0.5">
                      <div className="text-xs text-muted-foreground">vs Hercules Pro</div>
                      <div className="text-lg font-bold text-green-400">
                        ${75 - deployments[0].estimatedCost.monthlyTotal}/mo saved
                      </div>
                    </div>
                    <div className="text-2xl">📊</div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground pt-2">
                  Designed to help you choose the most cost-effective provider for your needs.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cost Guardrails */}
      {deployments && deployments.length > 0 && deployments[0].status === "success" && deployments[0].costDrift && (
        <Card className={`border-l-4 ${
          deployments[0].costDrift.status === "critical" 
            ? "border-l-red-500" 
            : deployments[0].costDrift.status === "warning"
            ? "border-l-yellow-500"
            : "border-l-green-500"
        }`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-400" />
              Cost Guardrails
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Overview */}
            <div className="flex items-start gap-3">
              {deployments[0].costDrift.status === "normal" ? (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                </div>
              ) : deployments[0].costDrift.status === "warning" ? (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                </div>
              ) : (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-lg font-semibold">
                  {deployments[0].costDrift.status === "normal"
                    ? "Costs are within expected range"
                    : deployments[0].costDrift.status === "warning"
                    ? "Costs increased — monitoring recommended"
                    : "Significant cost increase detected"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {deployments[0].costDrift.status === "normal"
                    ? "Your deployment costs are stable and predictable"
                    : deployments[0].costDrift.status === "warning"
                    ? "Your costs have increased moderately. Review usage patterns."
                    : "Your costs have increased significantly. Action recommended."}
                </p>
              </div>
            </div>

            {/* Cost Drift Timeline */}
            <div className={`p-4 rounded-lg border ${
              deployments[0].costDrift.status === "critical"
                ? "bg-red-500/10 border-red-500/30"
                : deployments[0].costDrift.status === "warning"
                ? "bg-yellow-500/10 border-yellow-500/30"
                : "bg-green-500/10 border-green-500/30"
            }`}>
              <div className="space-y-2">
                <div className="text-sm font-medium">Cost Drift Timeline</div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Initial Estimate:</span>
                  <span className="font-semibold">${deployments[0].costBaseline}/mo</span>
                  <TrendingUp className={`h-4 w-4 ${
                    deployments[0].costDrift.percentIncrease > 0 ? "text-red-400" : "text-green-400"
                  }`} />
                  <span className="text-muted-foreground">Current Estimate:</span>
                  <span className="font-semibold">${deployments[0].costDrift.currentEstimate}/mo</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    deployments[0].costDrift.percentIncrease > 0
                      ? "bg-red-500/20 text-red-300"
                      : "bg-green-500/20 text-green-300"
                  }`}>
                    {deployments[0].costDrift.percentIncrease > 0 ? "+" : ""}
                    {deployments[0].costDrift.percentIncrease}%
                  </span>
                </div>
              </div>
            </div>

            {/* Alert Configuration */}
            {deployments[0].costAlerts && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Alert Settings</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Alert threshold:</span>
                  <span className="px-2 py-1 rounded bg-slate-800 font-medium text-foreground">
                    {deployments[0].costAlerts.thresholdPercent}%
                  </span>
                  <span>increase</span>
                  {deployments[0].costAlerts.triggered && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-xs font-medium">
                      Alert Triggered
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  You'll be notified when costs increase by more than this percentage
                </p>
              </div>
            )}

            {/* Demo Controls */}
            <div className="pt-3 border-t border-slate-800">
              <details className="space-y-2">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  Demo: Simulate Cost Changes
                </summary>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await simulateCostDrift({
                        deploymentId: deployments[0]._id as Id<"deployments">,
                        percentIncrease: 0,
                      });
                      toast.success("Cost reset to baseline");
                    }}
                  >
                    Reset (0%)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await simulateCostDrift({
                        deploymentId: deployments[0]._id as Id<"deployments">,
                        percentIncrease: 10,
                      });
                      toast.success("Simulated +10% increase");
                    }}
                  >
                    +10%
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await simulateCostDrift({
                        deploymentId: deployments[0]._id as Id<"deployments">,
                        percentIncrease: 22,
                      });
                      toast.success("Simulated +22% increase");
                    }}
                  >
                    +22%
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await simulateCostDrift({
                        deploymentId: deployments[0]._id as Id<"deployments">,
                        percentIncrease: 35,
                      });
                      toast.success("Simulated +35% increase");
                    }}
                  >
                    +35%
                  </Button>
                </div>
              </details>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Optimization Advisor */}
      {deployments && deployments.length > 0 && deployments[0].status === "success" && deployments[0].costAdvisor && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-blue-400" />
              AI Cost Optimization Advisor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recommendation Headline */}
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                {deployments[0].costAdvisor.recommendation === "Switch Provider" ? (
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <TrendingDown className="h-5 w-5 text-green-400" />
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-blue-400" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {deployments[0].costAdvisor.recommendation === "Switch Provider"
                      ? `We recommend switching to ${getProviderConfig(deployments[0].costAdvisor.recommendedProvider)?.name || deployments[0].costAdvisor.recommendedProvider}`
                      : "Your current provider is optimal"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Based on your deployment profile and cost analysis
                  </p>
                </div>
              </div>
            </div>

            {/* Savings Highlight */}
            {deployments[0].costAdvisor.monthlySavings > 0 && (
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Potential Monthly Savings</div>
                    <div className="text-2xl font-bold text-green-400">
                      ${deployments[0].costAdvisor.monthlySavings}/month
                    </div>
                    <div className="text-xs text-green-300 mt-1">
                      ${deployments[0].costAdvisor.monthlySavings * 12}/year
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Confidence</div>
                    <div className="text-xl font-semibold">
                      {deployments[0].costAdvisor.confidenceScore}%
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Confidence Badge (when no savings) */}
            {deployments[0].costAdvisor.monthlySavings === 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Confidence:</span>
                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-sm font-medium">
                  {deployments[0].costAdvisor.confidenceScore}%
                </span>
              </div>
            )}

            {/* Reasoning */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Why this recommendation?</div>
              <ul className="space-y-2">
                {deployments[0].costAdvisor.reasoning.map((reason, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer Note */}
            <div className="pt-3 border-t border-slate-800">
              <p className="text-xs text-muted-foreground">
                This recommendation is based on typical usage patterns. Your actual costs may vary based on traffic and resource usage.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deployment Artifacts */}
      {deployments && deployments.length > 0 && deployments[0].status === "success" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Deployment Artifacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ArtifactExplorer artifacts={deployments[0].artifacts} />
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
              {deployments.map((deployment: Deployment) => (
                <div
                  key={deployment._id}
                  onClick={() => setSelectedDeployment(deployment)}
                  className="cursor-pointer hover:bg-slate-800 transition flex items-center justify-between rounded-md bg-slate-900 px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {deployment.provider} deployment
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(deployment.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Provider pill */}
                    <span className="px-2 py-1 text-[10px] rounded-full bg-slate-800 text-slate-200">
                      {deployment.provider}
                    </span>

                    {/* Status pill */}
                    <span
                      className={`px-2 py-1 text-[10px] rounded-full ${
                        deployment.status === "success"
                          ? "bg-green-500/20 text-green-300"
                          : deployment.status === "failed"
                          ? "bg-red-500/20 text-red-300"
                          : deployment.status === "running"
                          ? "bg-blue-500/20 text-blue-300"
                          : "bg-yellow-500/20 text-yellow-300"
                      }`}
                    >
                      {deployment.status}
                    </span>
                  </div>
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

      {selectedDeployment && (
        <DeploymentLogModal
          deployment={selectedDeployment}
          onClose={() => setSelectedDeployment(null)}
        />
      )}
    </div>
  );
}
