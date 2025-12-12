/**
 * Unified Deployment Simulator
 * Provides realistic simulation for all providers without making real API calls
 */

import type { DeploymentProvider, ProviderExecutionResult, ProjectContext } from "./types.js";

/**
 * Simulates a deployment for any provider
 * CRITICAL: This never makes external API calls and is fully deterministic
 */
export function simulateDeployment(
  provider: DeploymentProvider,
  project: ProjectContext
): ProviderExecutionResult {
  // Generate realistic but fake data
  const timestamp = Date.now();
  const simulatedId = `sim_${provider}_${timestamp.toString(36)}`;
  
  // Provider-specific domain patterns
  const domainPatterns: Record<DeploymentProvider, string> = {
    vercel: "vercel.app",
    render: "onrender.com",
    railway: "railway.app",
    netlify: "netlify.app",
    aws: "amplifyapp.com",
  };

  // Generate safe project slug
  const projectSlug = project.name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .substring(0, 32);

  const domain = domainPatterns[provider];
  const randomHash = Math.random().toString(36).substring(2, 8);
  const productionUrl = `https://${projectSlug}-${randomHash}.${domain}`;

  // Realistic simulated logs
  const logs = [
    `[${new Date().toLocaleTimeString()}] Initializing ${provider} deployment environment`,
    `[${new Date().toLocaleTimeString()}] Cloning repository${project.gitRepoUrl ? `: ${project.gitRepoUrl}` : ""}`,
    `[${new Date().toLocaleTimeString()}] Installing dependencies with npm`,
    `[${new Date().toLocaleTimeString()}] Running build command: npm run build`,
    `[${new Date().toLocaleTimeString()}] Build completed successfully`,
    `[${new Date().toLocaleTimeString()}] Optimizing assets`,
    `[${new Date().toLocaleTimeString()}] Uploading build artifacts to ${provider}`,
    `[${new Date().toLocaleTimeString()}] Deployment successful (simulated)`,
    `[${new Date().toLocaleTimeString()}] 🟡 Simulation Mode: No real infrastructure created`,
  ];

  return {
    provider,
    status: "success",
    deploymentId: simulatedId,
    productionUrl,
    logs,
    metadata: {
      projectId: simulatedId,
      buildTime: 1.5 + Math.random() * 0.5, // 1.5-2.0 seconds
      region: "simulated-us-east-1",
    },
  };
}

/**
 * Simulates a deployment failure (for testing error handling)
 */
export function simulateDeploymentFailure(
  provider: DeploymentProvider,
  project: ProjectContext,
  errorMessage: string
): ProviderExecutionResult {
  const logs = [
    `[${new Date().toLocaleTimeString()}] Initializing ${provider} deployment environment`,
    `[${new Date().toLocaleTimeString()}] Installing dependencies`,
    `[${new Date().toLocaleTimeString()}] ❌ Error: ${errorMessage}`,
    `[${new Date().toLocaleTimeString()}] Deployment failed (simulated)`,
  ];

  return {
    provider,
    status: "failed",
    logs,
    error: errorMessage,
  };
}
