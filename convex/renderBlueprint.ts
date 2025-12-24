/**
 * Render Blueprint Generator
 * 
 * Generates Render Blueprint (render.yaml) specifications for static SPA deployments.
 * Ensures proper SPA routing with automatic rewrite rules.
 */

export type RenderBlueprintInput = {
  serviceName: string;
  buildCommand: string;
  publishDir: string;
  rootDirectory?: string;
};

export type RenderRouteRewrite = {
  type: "rewrite";
  source: string;
  destination: string;
};

export type RenderBlueprintSpec = {
  serviceName: string;
  buildCommand: string;
  publishDir: string;
  rootDirectory?: string;
  routes: RenderRouteRewrite[];
  yamlContent: string;
};

/**
 * Generates a complete Render Blueprint specification for SPA hosting
 */
export function generateRenderBlueprint(
  input: RenderBlueprintInput
): RenderBlueprintSpec {
  const { serviceName, buildCommand, publishDir, rootDirectory } = input;

  // SPA rewrite rule - routes all requests to index.html
  const spaRewriteRule: RenderRouteRewrite = {
    type: "rewrite",
    source: "/*",
    destination: "/index.html",
  };

  // Generate YAML content
  const yamlContent = `services:
  - type: web
    name: ${serviceName}
    env: static
    ${rootDirectory ? `rootDir: ${rootDirectory}\n    ` : ""}buildCommand: ${buildCommand}
    staticPublishPath: ${publishDir}
    routes:
      - type: rewrite
        source: /*
        destination: /index.html`;

  return {
    serviceName,
    buildCommand,
    publishDir,
    rootDirectory,
    routes: [spaRewriteRule],
    yamlContent,
  };
}

/**
 * Determines if a project requires Blueprint-based deployment
 * Uses safe defaults: For React/Vite SPAs on Render, ALWAYS use Blueprint
 */
export function requiresBlueprint(fingerprint: {
  appType?: string;
  framework?: string;
  routerMode?: string;
  needsSpaRewrite?: boolean;
}): boolean {
  // Primary check: Does the fingerprint explicitly say it needs SPA rewrites?
  if (fingerprint.needsSpaRewrite === true) {
    return true;
  }
  
  // Fallback: For any React/Vite static SPA, enable Blueprint (safe default)
  // This prevents 404s even if detection wasn't perfect
  const isReactSpa =
    fingerprint.appType === "STATIC_SPA" &&
    (fingerprint.framework === "vite-react" || fingerprint.framework === "create-react-app");
  
  const isNotHashRouter = fingerprint.routerMode !== "hash";
  
  return isReactSpa && isNotHashRouter;
}

/**
 * Extracts route configuration for Render API
 */
export function extractRouteConfig(
  blueprint: RenderBlueprintSpec
): { routes: Array<{ type: string; source: string; destination: string }> } {
  return {
    routes: blueprint.routes.map((route) => ({
      type: route.type,
      source: route.source,
      destination: route.destination,
    })),
  };
}
