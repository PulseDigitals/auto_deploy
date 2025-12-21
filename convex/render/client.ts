"use node";

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * RENDER API CLIENT
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Handles all interactions with the Render.com API
 * Documentation: https://api-docs.render.com/
 */

const RENDER_API_BASE = "https://api.render.com/v1";

/**
 * Render Service Type
 */
export type RenderServiceType = "web_service" | "private_service" | "background_worker" | "cron_job" | "static_site";

/**
 * Render Runtime
 */
export type RenderRuntime = "node" | "docker" | "python" | "ruby" | "go" | "rust" | "elixir";

/**
 * Render Region
 */
export type RenderRegion = 
  | "oregon" 
  | "frankfurt" 
  | "singapore" 
  | "ohio";

/**
 * Environment Variable for Render service
 */
export interface RenderEnvVar {
  key: string;
  value: string;
}

/**
 * Create Service Input
 */
export interface CreateServiceInput {
  name: string;
  type: RenderServiceType;
  runtime: RenderRuntime;
  region?: RenderRegion;
  repo?: string; // GitHub repository URL
  branch?: string; // Git branch (default: main)
  buildCommand?: string;
  startCommand?: string;
  envVars?: RenderEnvVar[];
  autoDeploy?: boolean; // Auto-deploy on git push
}

/**
 * Service Response from Render API
 */
export interface RenderService {
  id: string;
  name: string;
  type: string;
  serviceDetails: {
    url?: string;
    buildCommand?: string;
    startCommand?: string;
    env?: string;
    region?: string;
    autoDeploy?: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Deploy Response from Render API
 */
export interface RenderDeploy {
  id: string;
  status: "created" | "build_in_progress" | "update_in_progress" | "live" | "deactivated" | "build_failed" | "update_failed" | "canceled";
  createdAt: string;
  updatedAt: string;
  finishedAt?: string;
}

/**
 * Account Owner Response
 */
export interface RenderOwner {
  id: string;
  name: string;
  email: string;
  type: "user" | "team";
}

/**
 * Render API Client
 */
export class RenderClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Make authenticated request to Render API
   */
  private async request<T>(
    endpoint: string,
    options: {
      method?: string;
      body?: unknown;
    } = {}
  ): Promise<T> {
    const { method = "GET", body } = options;

    const url = `${RENDER_API_BASE}${endpoint}`;
    
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Accept": "application/json",
    };

    if (body) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorText;
      } catch {
        errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
      }

      throw new Error(`Render API error: ${errorMessage}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Validate API key by fetching current user/owner
   */
  async validateApiKey(): Promise<{ valid: boolean; owner?: RenderOwner; error?: string }> {
    try {
      const owners = await this.request<RenderOwner[]>("/owners");
      
      if (!owners || owners.length === 0) {
        return {
          valid: false,
          error: "No account found with this API key",
        };
      }

      // Return the first owner (usually the user's personal account)
      return {
        valid: true,
        owner: owners[0],
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * List all services for the account
   */
  async listServices(): Promise<RenderService[]> {
    return this.request<RenderService[]>("/services");
  }

  /**
   * Get service by ID
   */
  async getService(serviceId: string): Promise<RenderService> {
    return this.request<RenderService>(`/services/${serviceId}`);
  }

  /**
   * Create a new service
   */
  async createService(input: CreateServiceInput): Promise<RenderService> {
    // Build the service payload based on Render API spec
    const payload: Record<string, unknown> = {
      name: input.name,
      type: input.type,
      serviceDetails: {
        env: input.runtime === "node" ? "node" : input.runtime === "docker" ? "docker" : "node",
        region: input.region || "oregon",
        buildCommand: input.buildCommand || "",
        startCommand: input.startCommand || "",
        autoDeploy: input.autoDeploy !== false ? "yes" : "no",
      },
    };

    // Add repo if provided
    if (input.repo) {
      payload.serviceDetails = {
        ...payload.serviceDetails as Record<string, unknown>,
        repo: input.repo,
        branch: input.branch || "main",
      };
    }

    // Add environment variables if provided
    if (input.envVars && input.envVars.length > 0) {
      payload.envVars = input.envVars;
    }

    return this.request<RenderService>("/services", {
      method: "POST",
      body: payload,
    });
  }

  /**
   * Trigger a manual deploy for a service
   */
  async triggerDeploy(serviceId: string): Promise<RenderDeploy> {
    return this.request<RenderDeploy>(`/services/${serviceId}/deploys`, {
      method: "POST",
      body: {
        clearCache: "do_not_clear", // Options: "do_not_clear" | "clear"
      },
    });
  }

  /**
   * Get latest deploy for a service
   */
  async getLatestDeploy(serviceId: string): Promise<RenderDeploy | null> {
    try {
      const deploys = await this.request<RenderDeploy[]>(`/services/${serviceId}/deploys`);
      
      if (!deploys || deploys.length === 0) {
        return null;
      }

      // Return the most recent deploy
      return deploys[0];
    } catch (error) {
      console.error("Failed to fetch deploys:", error);
      return null;
    }
  }

  /**
   * Update service environment variables
   */
  async updateEnvVars(serviceId: string, envVars: RenderEnvVar[]): Promise<void> {
    await this.request(`/services/${serviceId}/env-vars`, {
      method: "PUT",
      body: envVars,
    });
  }

  /**
   * Delete a service
   */
  async deleteService(serviceId: string): Promise<void> {
    await this.request(`/services/${serviceId}`, {
      method: "DELETE",
    });
  }
}
