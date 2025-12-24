/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * HOSTING INTELLIGENCE MODULE
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Core decision engine for automatic deployment configuration.
 * Analyzes codebases, detects app types, and generates provider-specific
 * deployment plans with zero user configuration required.
 * 
 * Philosophy: The system must behave like a senior platform engineer:
 * - Detect → Decide → Enforce → Verify → Self-Heal
 */

/**
 * Codebase Fingerprint
 * Complete analysis of repository structure and requirements
 */
export type CodebaseFingerprint = {
  framework: "vite-react" | "nextjs" | "create-react-app" | "node-api" | "static" | "unknown";
  hasFrontend: boolean;
  hasBackend: boolean;
  frontendRoot: string; // Path to frontend code (e.g., "client", "frontend", ".")
  backendRoot?: string; // Path to backend code (e.g., "server", "api")
  buildOutputDir: string; // Where build artifacts go (e.g., "dist", "build", "out")
  routerMode?: "browser" | "hash" | "none";
  needsSpaRewrite: boolean; // Does this app need SPA fallback routing?
  packageManager: "npm" | "yarn" | "pnpm";
  hasMonorepo: boolean; // Is this a monorepo structure?
  buildCommand?: string; // Detected build command
  nodeVersion?: string; // Required Node version
};

/**
 * Provider-Specific Patches
 * Automatic fixes that must be applied for correct hosting
 */
export type ProviderPatch =
  | {
      type: "RENDER_REWRITE";
      source: string;
      destination: string;
      explanation: string;
    }
  | {
      type: "RENDER_HEADER";
      path: string;
      headers: Record<string, string>;
      explanation: string;
    }
  | {
      type: "NETLIFY_REDIRECTS";
      filePath: string;
      content: string;
      explanation: string;
    }
  | {
      type: "NETLIFY_HEADERS";
      filePath: string;
      content: string;
      explanation: string;
    }
  | {
      type: "VERCEL_REWRITE";
      filePath: string;
      content: object;
      explanation: string;
    }
  | {
      type: "BUILD_OUTPUT_FILE";
      filePath: string;
      content: string;
      explanation: string;
    };

/**
 * Deployment Plan
 * Complete specification of how to deploy this application
 */
export type DeploymentPlan = {
  appType: "STATIC_SPA" | "SSR_APP" | "API_SERVICE" | "FULLSTACK" | "STATIC_SITE";
  provider: "render" | "vercel" | "netlify";
  buildCommand: string;
  publishDir: string;
  rootDir?: string; // For monorepos
  patches: ProviderPatch[];
  validationRoutes: string[]; // Routes to test after deployment
  healthCheckConfig: {
    timeout: number; // Seconds to wait before first check
    retries: number; // Number of validation attempts
    interval: number; // Seconds between retries
  };
  explanation: string; // User-friendly explanation
  technicalNotes: string[]; // What the system did automatically
};

/**
 * Validation Result
 * Outcome of deployment health checks
 */
export type ValidationResult = {
  success: boolean;
  checkedRoutes: Array<{
    route: string;
    status: number;
    success: boolean;
    error?: string;
  }>;
  needsHealing: boolean;
  healingActions?: string[];
};

/**
 * Package.json structure (partial)
 */
export interface PackageJson {
  name?: string;
  version?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: {
    node?: string;
    npm?: string;
  };
}

/**
 * Analyze codebase and generate fingerprint
 * This is the core intelligence that understands what kind of app this is
 */
export function analyzeCodebase(
  files: string[],
  packageJson: PackageJson | null
): CodebaseFingerprint {
  // Detect framework
  const hasVite = files.some((f) => f.includes("vite.config"));
  const hasNext = files.some((f) => f.includes("next.config"));
  const hasCreateReactApp = packageJson?.dependencies?.["react-scripts"] !== undefined;
  const hasReact = packageJson?.dependencies?.["react"] !== undefined;
  const hasIndexHtml = files.some((f) => f.endsWith("index.html"));

  // Detect monorepo structure
  const hasClient = files.some((f) => f.startsWith("client/"));
  const hasFrontend = files.some((f) => f.startsWith("frontend/"));
  const hasServer = files.some((f) => f.startsWith("server/"));
  const hasApi = files.some((f) => f.startsWith("api/"));
  const hasPackages = files.some((f) => f.startsWith("packages/"));

  const isMonorepo = hasClient || hasFrontend || hasPackages;

  // Determine frontend root
  let frontendRoot = ".";
  if (hasClient) frontendRoot = "client";
  else if (hasFrontend) frontendRoot = "frontend";
  else if (hasPackages && files.some((f) => f.startsWith("packages/web/")))
    frontendRoot = "packages/web";

  // Determine backend root
  let backendRoot: string | undefined;
  if (hasServer) backendRoot = "server";
  else if (hasApi) backendRoot = "api";

  // Detect router mode
  const fileContents = files.join("\n").toLowerCase();
  const usesReactRouter =
    packageJson?.dependencies?.["react-router-dom"] !== undefined ||
    packageJson?.dependencies?.["react-router"] !== undefined;
  const usesHashRouter = fileContents.includes("hashrouter");
  const usesBrowserRouter = fileContents.includes("browserrouter") || usesReactRouter;

  let routerMode: "browser" | "hash" | "none" = "none";
  if (usesHashRouter) routerMode = "hash";
  else if (usesBrowserRouter) routerMode = "browser";

  // Determine framework
  let framework: CodebaseFingerprint["framework"] = "unknown";
  if (hasNext) framework = "nextjs";
  else if (hasVite && hasReact) framework = "vite-react";
  else if (hasCreateReactApp) framework = "create-react-app";
  else if (hasIndexHtml && !hasReact) framework = "static";
  else if (backendRoot && !hasIndexHtml) framework = "node-api";

  // Detect build output directory
  let buildOutputDir = "dist"; // Default for Vite
  if (framework === "nextjs") buildOutputDir = ".next";
  else if (framework === "create-react-app") buildOutputDir = "build";
  else if (packageJson?.scripts?.build) {
    // Try to detect from build script
    const buildScript = packageJson.scripts.build;
    if (buildScript.includes("--outDir")) {
      const match = buildScript.match(/--outDir[= ](\S+)/);
      if (match) buildOutputDir = match[1];
    }
  }

  // Detect package manager
  let packageManager: "npm" | "yarn" | "pnpm" = "npm";
  if (files.includes("pnpm-lock.yaml")) packageManager = "pnpm";
  else if (files.includes("yarn.lock")) packageManager = "yarn";

  // Detect build command
  let buildCommand: string | undefined;
  if (packageJson?.scripts?.build) {
    buildCommand = packageJson.scripts.build;
  }

  // Does this need SPA rewrite?
  const needsSpaRewrite = routerMode === "browser" && framework !== "nextjs";

  return {
    framework,
    hasFrontend: hasIndexHtml || hasReact,
    hasBackend: !!backendRoot,
    frontendRoot,
    backendRoot,
    buildOutputDir,
    routerMode,
    needsSpaRewrite,
    packageManager,
    hasMonorepo: isMonorepo,
    buildCommand,
    nodeVersion: packageJson?.engines?.node,
  };
}

/**
 * Generate deployment plan for a given provider
 * This is where provider-specific intelligence lives
 */
export function generateDeploymentPlan(
  fingerprint: CodebaseFingerprint,
  provider: "render" | "vercel" | "netlify"
): DeploymentPlan {
  // Static SPA (most common case)
  if (
    fingerprint.hasFrontend &&
    (fingerprint.framework === "vite-react" ||
      fingerprint.framework === "create-react-app")
  ) {
    return generateStaticSpaPlan(fingerprint, provider);
  }

  // Next.js SSR
  if (fingerprint.framework === "nextjs") {
    return generateNextJsPlan(fingerprint, provider);
  }

  // Static site (no framework)
  if (fingerprint.framework === "static") {
    return generateStaticSitePlan(fingerprint, provider);
  }

  // API service
  if (fingerprint.framework === "node-api") {
    return generateApiServicePlan(fingerprint, provider);
  }

  // Fullstack (frontend + backend)
  if (fingerprint.hasFrontend && fingerprint.hasBackend) {
    return generateFullstackPlan(fingerprint, provider);
  }

  throw new Error(
    `Unsupported application type: framework=${fingerprint.framework}, ` +
      `hasFrontend=${fingerprint.hasFrontend}, hasBackend=${fingerprint.hasBackend}`
  );
}

/**
 * Generate plan for Static SPA (React, Vue, etc.)
 */
function generateStaticSpaPlan(
  fingerprint: CodebaseFingerprint,
  provider: "render" | "vercel" | "netlify"
): DeploymentPlan {
  const baseCommand = `${fingerprint.packageManager} install && ${fingerprint.packageManager} run build`;
  const patches: ProviderPatch[] = [];
  const technicalNotes: string[] = [];

  // Provider-specific SPA routing configuration
  if (fingerprint.needsSpaRewrite) {
    if (provider === "render") {
      // Render uses API-level rewrites (configured via serviceDetails)
      // We'll handle this in the Render deployment orchestrator
      technicalNotes.push(
        "Configured Render service with /* → /index.html rewrite for client-side routing"
      );
    } else if (provider === "netlify") {
      patches.push({
        type: "NETLIFY_REDIRECTS",
        filePath: `${fingerprint.buildOutputDir}/_redirects`,
        content: "/*    /index.html   200\n",
        explanation: "Netlify _redirects file for SPA routing",
      });
      technicalNotes.push(
        "Added _redirects file to handle client-side routing on Netlify"
      );
    } else if (provider === "vercel") {
      patches.push({
        type: "VERCEL_REWRITE",
        filePath: "vercel.json",
        content: {
          rewrites: [{ source: "/(.*)", destination: "/" }],
        },
        explanation: "Vercel rewrite rules for SPA routing",
      });
      technicalNotes.push(
        "Created vercel.json with rewrite rules for client-side routing"
      );
    }
  }

  // Add security headers for production
  if (provider === "netlify") {
    patches.push({
      type: "NETLIFY_HEADERS",
      filePath: `${fingerprint.buildOutputDir}/_headers`,
      content: `/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
`,
      explanation: "Security headers for production deployment",
    });
    technicalNotes.push("Added security headers for production best practices");
  }

  return {
    appType: "STATIC_SPA",
    provider,
    buildCommand: baseCommand,
    publishDir: fingerprint.buildOutputDir,
    rootDir: fingerprint.hasMonorepo ? fingerprint.frontendRoot : undefined,
    patches,
    validationRoutes: ["/", "/dashboard", "/about"],
    healthCheckConfig: {
      timeout: 60, // Wait 60s for build to complete
      retries: 3,
      interval: 10,
    },
    explanation: `Detected a ${fingerprint.framework} single-page application with ${fingerprint.routerMode} routing. We automatically configured hosting to ensure all routes work correctly.`,
    technicalNotes,
  };
}

/**
 * Generate plan for Next.js SSR apps
 */
function generateNextJsPlan(
  fingerprint: CodebaseFingerprint,
  provider: "render" | "vercel" | "netlify"
): DeploymentPlan {
  if (provider !== "vercel") {
    throw new Error(
      "Next.js applications are best deployed to Vercel. Render and Netlify support is limited."
    );
  }

  return {
    appType: "SSR_APP",
    provider: "vercel",
    buildCommand: `${fingerprint.packageManager} install && ${fingerprint.packageManager} run build`,
    publishDir: ".next",
    patches: [],
    validationRoutes: ["/"],
    healthCheckConfig: {
      timeout: 90,
      retries: 3,
      interval: 15,
    },
    explanation:
      "Detected a Next.js application. Vercel provides native Next.js support with zero configuration.",
    technicalNotes: ["Using Vercel's native Next.js deployment pipeline"],
  };
}

/**
 * Generate plan for static sites (HTML/CSS/JS)
 */
function generateStaticSitePlan(
  fingerprint: CodebaseFingerprint,
  provider: "render" | "vercel" | "netlify"
): DeploymentPlan {
  return {
    appType: "STATIC_SITE",
    provider,
    buildCommand: "echo 'No build required for static site'",
    publishDir: ".",
    patches: [],
    validationRoutes: ["/", "/index.html"],
    healthCheckConfig: {
      timeout: 30,
      retries: 2,
      interval: 5,
    },
    explanation: "Detected a static HTML/CSS/JS website with no build process required.",
    technicalNotes: ["Deploying static files directly without build step"],
  };
}

/**
 * Generate plan for Node.js API services
 */
function generateApiServicePlan(
  fingerprint: CodebaseFingerprint,
  provider: "render" | "vercel" | "netlify"
): DeploymentPlan {
  if (provider === "render") {
    return {
      appType: "API_SERVICE",
      provider: "render",
      buildCommand: `${fingerprint.packageManager} install`,
      publishDir: ".",
      patches: [],
      validationRoutes: ["/health", "/api"],
      healthCheckConfig: {
        timeout: 60,
        retries: 3,
        interval: 10,
      },
      explanation:
        "Detected a Node.js API service. Render will host this as a web service.",
      technicalNotes: ["Deploying as Render web service with automatic scaling"],
    };
  }

  throw new Error(`API services are not supported on ${provider}. Use Render instead.`);
}

/**
 * Generate plan for fullstack apps (frontend + backend)
 */
function generateFullstackPlan(
  fingerprint: CodebaseFingerprint,
  provider: "render" | "vercel" | "netlify"
): DeploymentPlan {
  // For now, we only deploy the frontend part
  // Backend must be deployed separately
  return {
    ...generateStaticSpaPlan(fingerprint, provider),
    appType: "FULLSTACK",
    explanation:
      "Detected a fullstack application. Currently deploying frontend only. Backend must be deployed separately.",
    technicalNotes: [
      "Frontend deployed to static hosting",
      "Backend deployment not automated (requires separate service)",
    ],
  };
}

/**
 * Validate deployment health
 * Checks if deployed app is actually working
 */
export async function validateDeployment(
  baseUrl: string,
  routes: string[],
  timeout: number = 30000
): Promise<ValidationResult> {
  const results: ValidationResult["checkedRoutes"] = [];
  let allSuccess = true;

  for (const route of routes) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(baseUrl + route, {
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timeoutId);

      const success = res.status === 200;
      if (!success) allSuccess = false;

      results.push({
        route,
        status: res.status,
        success,
        error: success ? undefined : `HTTP ${res.status}`,
      });
    } catch (error) {
      allSuccess = false;
      results.push({
        route,
        status: 0,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Determine if healing is needed
  const needsHealing = !allSuccess && results.some((r) => r.status === 404);

  return {
    success: allSuccess,
    checkedRoutes: results,
    needsHealing,
    healingActions: needsHealing
      ? [
          "Re-apply SPA routing configuration",
          "Verify build output structure",
          "Trigger re-deployment",
        ]
      : undefined,
  };
}

/**
 * Determine if deployment needs healing based on validation
 */
export function shouldHeal(validation: ValidationResult): boolean {
  return validation.needsHealing && !validation.success;
}
