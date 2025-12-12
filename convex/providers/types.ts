/**
 * Provider Execution Types
 * Unified interface for all deployment providers
 */

export type DeploymentProvider = "vercel" | "render" | "railway" | "netlify" | "aws";

export type DeploymentMode = "simulation" | "live";

export type DeploymentStatus = "pending" | "running" | "success" | "failed";

export interface ProjectContext {
  id: string;
  name: string;
  gitRepoUrl?: string;
}

export interface ProviderExecutionResult {
  provider: DeploymentProvider;
  status: DeploymentStatus;
  deploymentId?: string;
  productionUrl?: string;
  logs: string[];
  error?: string;
  metadata?: {
    projectId?: string;
    buildTime?: number;
    region?: string;
  };
}

export interface ProviderAdapter {
  /**
   * Executes a live deployment on the provider
   */
  executeLiveDeployment(project: ProjectContext): Promise<ProviderExecutionResult>;

  /**
   * Validates that the provider is properly configured for live deployments
   */
  validateConfiguration(): Promise<{ valid: boolean; error?: string }>;
}

export interface ProviderCapabilities {
  live: boolean;
  simulation: boolean;
  oauth: boolean;
  statusPolling: boolean;
  rollback: boolean;
  customDomains: boolean;
  environmentVariables: boolean;
}
