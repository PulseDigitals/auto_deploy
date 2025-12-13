/**
 * Get the Convex HTTP Actions base URL
 * HTTP Actions are deployed on the Convex deployment domain
 * 
 * Local dev: http://localhost:3000
 * Production: https://<deployment>.convex.site (note: .site not .cloud)
 */
export function getConvexHttpUrl(): string {
  const convexUrl = import.meta.env.VITE_CONVEX_URL ?? "http://localhost:3000";
  
  // For local development, use the same URL
  if (convexUrl.includes("localhost")) {
    return convexUrl;
  }
  
  // For production, convert .convex.cloud to .convex.site
  // HTTP Actions are served on .convex.site domain
  if (convexUrl.includes(".convex.cloud")) {
    return convexUrl.replace(".convex.cloud", ".convex.site");
  }
  
  // Fallback: use as-is
  return convexUrl;
}

/**
 * Get the full OAuth start URL for a provider
 */
export function getOAuthStartUrl(provider: "vercel"): string {
  const baseUrl = getConvexHttpUrl();
  return `${baseUrl}/api/oauth/${provider}/start`;
}
