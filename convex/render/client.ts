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
  rootDirectory?: string; // Root directory for monorepos (e.g., "client")
  buildCommand?: string;
  startCommand?: string;
  publishPath?: string; // Output directory (e.g., "dist", "build")
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
 * Account Owner Response (wrapped structure from API)
 */
export interface RenderOwnerWrapper {
  cursor: string;
  owner: RenderOwner;
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

    console.log(`[Render API Request] ${method} ${url}`);
    if (body) {
      console.log(`[Render API Request Body]:`, JSON.stringify(body, null, 2));
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Render API Error] Status: ${response.status} ${response.statusText}`);
      console.error(`[Render API Error] URL: ${url}`);
      console.error(`[Render API Error] Method: ${method}`);
      console.error(`[Render API Error] Response Body:`, errorText);
      
      let errorMessage: string;
      let fullErrorDetails: string;
      
      try {
        const errorJson = JSON.parse(errorText);
        console.error(`[Render API Error] Parsed JSON:`, JSON.stringify(errorJson, null, 2));
        errorMessage = errorJson.message || errorJson.error || errorText;
        fullErrorDetails = JSON.stringify(errorJson, null, 2);
      } catch {
        errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
        fullErrorDetails = errorText;
      }

      throw new Error(`Render API error (${response.status}): ${errorMessage}\n\nFull details: ${fullErrorDetails}`);
    }

    const result = await response.json() as Promise<T>;
    console.log(`[Render API Success] ${method} ${endpoint} completed successfully`);
    
    // Log the response for debugging (especially for service creation)
    if (endpoint === "/services" && method === "POST") {
      console.log("[Render API Response]", JSON.stringify(result, null, 2));
    }
    
    return result;
  }

  /**
   * Validate API key by fetching current user/owner
   */
  async validateApiKey(): Promise<{ valid: boolean; owner?: RenderOwner; error?: string }> {
    try {
      const ownersResponse = await this.request<RenderOwnerWrapper[]>("/owners");
      
      if (!ownersResponse || ownersResponse.length === 0) {
        return {
          valid: false,
          error: "No account found with this API key",
        };
      }

      // Extract the owner from the wrapped response
      const owner = ownersResponse[0].owner;
      
      return {
        valid: true,
        owner,
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
    const response = await this.request<RenderService[] | { service: RenderService }[]>("/services");
    
    // Handle both array response formats
    if (Array.isArray(response) && response.length > 0) {
      // Check if it's wrapped like owners endpoint
      if ('service' in response[0]) {
        console.log("[Render] Services are wrapped, extracting...");
        return (response as { service: RenderService }[]).map(item => item.service);
      }
    }
    
    return response as RenderService[];
  }

  /**
   * Get service by ID
   */
  async getService(serviceId: string): Promise<RenderService> {
    return this.request<RenderService>(`/services/${serviceId}`);
  }

  /**
   * Get owner ID (required for creating services)
   */
  async getOwnerId(): Promise<string> {
    try {
      const ownersResponse = await this.request<RenderOwnerWrapper[]>("/owners");
      
      console.log("[Render] Owners response:", JSON.stringify(ownersResponse, null, 2));
      
      if (!ownersResponse || ownersResponse.length === 0) {
        throw new Error("No owner found for this API key");
      }
      
      // Extract owner from the wrapped response structure
      const owner = ownersResponse[0].owner;
      
      if (!owner || !owner.id) {
        throw new Error("Owner object missing or invalid");
      }
      
      const ownerId = owner.id;
      console.log("[Render] Selected owner ID:", ownerId);
      console.log("[Render] Owner name:", owner.name);
      console.log("[Render] Owner type:", owner.type);
      
      return ownerId;
    } catch (error) {
      console.error("[Render] Failed to get owner ID:", error);
      throw error;
    }
  }

  /**
   * Create a new service
   */
  async createService(input: CreateServiceInput): Promise<RenderService> {
    // Get owner ID first (required by Render API)
    const ownerId = await this.getOwnerId();
    
    console.log("[Render] Creating service with ownerId:", ownerId);

    // Build the service payload based on Render API spec
    const payload: Record<string, unknown> = {
      ownerId, // REQUIRED: Owner ID for the service
      name: input.name,
      type: input.type,
    };
    
    // Add repo and branch at the top level (required for static_site)
    if (input.repo) {
      payload.repo = input.repo;
      payload.branch = input.branch || "main";
    }
    
    // Build serviceDetails based on service type
    const serviceDetails: Record<string, unknown> = {
      autoDeploy: input.autoDeploy !== false ? "yes" : "no",
    };
    
    // Add root directory for monorepos (e.g., "client")
    if (input.rootDirectory) {
      serviceDetails.rootDir = input.rootDirectory;
    }
    
    // Add publish path (output directory)
    if (input.publishPath) {
      serviceDetails.publishPath = input.publishPath;
    }
    
    // For static_site: region is NOT a valid parameter (Render API restriction)
    // For other service types: region IS valid
    if (input.type !== "static_site" && input.region) {
      serviceDetails.region = input.region;
    }
    
    // Only add env for non-static_site services
    if (input.type !== "static_site") {
      serviceDetails.env = input.runtime === "node" ? "node" : input.runtime === "docker" ? "docker" : "node";
      serviceDetails.startCommand = input.startCommand || "";
    }
    
    // Add build command if provided
    if (input.buildCommand) {
      serviceDetails.buildCommand = input.buildCommand;
    }
    
    payload.serviceDetails = serviceDetails;

    // Add environment variables if provided
    if (input.envVars && input.envVars.length > 0) {
      payload.envVars = input.envVars;
    }
    
    console.log("[Render] Request payload:", JSON.stringify(payload, null, 2));

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
