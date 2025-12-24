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
 */
export function requiresBlueprint(fingerprint: {
  appType?: string;
  framework?: string;
  routerMode?: string;
  needsSpaRewrite?: boolean;
}): boolean {
  return (
    fingerprint.appType === "STATIC_SPA" &&
    (fingerprint.framework === "React" || fingerprint.framework === "Vite") &&
    fingerprint.routerMode === "BrowserRouter" &&
    fingerprint.needsSpaRewrite === true
  );
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
