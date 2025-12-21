/**
 * Provider Adapter Registry
 * Central registry for all deployment provider adapters
 * 
 * ARCHITECTURAL PRINCIPLE:
 * All deployments MUST flow through this registry.
 * No provider may bypass the execution engine.
 */

import type { DeploymentProvider, DeploymentMode, ProviderExecutionResult, ProjectContext, ProviderCapabilities } from "./types.js";
import { simulateDeployment } from "./simulator.js";

/**
 * Provider Capability Matrix
 * Defines what each provider currently supports
 */
export const PROVIDER_CAPABILITIES: Record<DeploymentProvider, ProviderCapabilities> = {
  vercel: {
    live: true,
    simulation: true,
    oauth: true,
    statusPolling: true,
    rollback: false,
    customDomains: true,
    environmentVariables: true,
  },
  render: {
    live: true, // API Key authentication
    simulation: true,
    oauth: false, // Uses API Key instead
    statusPolling: true,
    rollback: false,
    customDomains: true,
    environmentVariables: true,
  },
  railway: {
    live: false, // Coming soon
    simulation: true,
    oauth: false,
    statusPolling: false,
    rollback: false,
    customDomains: false,
    environmentVariables: false,
  },
  netlify: {
    live: false, // Coming soon
    simulation: true,
    oauth: false,
    statusPolling: false,
    rollback: false,
    customDomains: false,
    environmentVariables: false,
  },
  aws: {
    live: false, // Coming soon
    simulation: true,
    oauth: false,
    statusPolling: false,
    rollback: false,
    customDomains: false,
    environmentVariables: false,
  },
};

/**
 * Main execution function - single source of truth for all deployments
 * 
 * CRITICAL: All deployments flow through here
 */
export async function executeProviderDeployment({
  provider,
  mode,
  project,
}: {
  provider: DeploymentProvider;
  mode: DeploymentMode;
  project: ProjectContext;
}): Promise<ProviderExecutionResult> {
  // Validate provider
  if (!PROVIDER_CAPABILITIES[provider]) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  // SIMULATION MODE (works for all providers)
  if (mode === "simulation") {
    return simulateDeployment(provider, project);
  }

  // LIVE MODE (provider-specific)
  const capabilities = PROVIDER_CAPABILITIES[provider];
  
  if (!capabilities.live) {
    throw new Error(
      `Live deployment not yet available for ${provider}. Use simulation mode or try Vercel.`
    );
  }

  // Route to provider-specific live executor
  switch (provider) {
    case "vercel":
      // Vercel live deployment will be handled by the existing pipeline
      // This returns a pending status and the existing Vercel orchestrator takes over
      return {
        provider: "vercel",
        status: "pending",
        logs: [`[${new Date().toLocaleTimeString()}] Initiating Vercel live deployment...`],
        metadata: {
          projectId: project.id,
        },
      };

    case "render":
      // Render live deployment will be handled by the Render deployment pipeline
      return {
        provider: "render",
        status: "pending",
        logs: [`[${new Date().toLocaleTimeString()}] Initiating Render live deployment...`],
        metadata: {
          projectId: project.id,
        },
      };

    case "railway":
    case "netlify":
    case "aws":
      throw new Error(`Live deployment not implemented for ${provider} yet`);

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Checks if a provider supports a specific capability
 */
export function providerSupports(
  provider: DeploymentProvider,
  capability: keyof ProviderCapabilities
): boolean {
  return PROVIDER_CAPABILITIES[provider]?.[capability] ?? false;
}

/**
 * Gets all capabilities for a provider
 */
export function getProviderCapabilities(provider: DeploymentProvider): ProviderCapabilities {
  return PROVIDER_CAPABILITIES[provider];
}

/**
 * Validates that a deployment can proceed
 */
export function validateDeployment({
  provider,
  mode,
}: {
  provider: DeploymentProvider;
  mode: DeploymentMode;
}): { valid: boolean; error?: string } {
  const capabilities = PROVIDER_CAPABILITIES[provider];

  if (!capabilities) {
    return {
      valid: false,
      error: `Provider ${provider} is not supported`,
    };
  }

  if (mode === "live" && !capabilities.live) {
    return {
      valid: false,
      error: `Live deployment not yet available for ${provider}`,
    };
  }

  return { valid: true };
}
