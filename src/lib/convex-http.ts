/**
 * Convex HTTP Actions base URL
 * HTTP actions are served on the SAME domain as the Convex deployment
 */
export function getConvexHttpUrl(): string {
  const convexUrl = import.meta.env.VITE_CONVEX_URL;

  if (!convexUrl) {
    throw new Error(
      "VITE_CONVEX_URL is not defined. Check Vercel environment variables."
    );
  }

  // Use .convex.site for HTTP actions when a .convex.cloud URL is provided
  if (convexUrl.includes(".convex.cloud")) {
    return convexUrl.replace(".convex.cloud", ".convex.site");
  }

  return convexUrl;
}

/**
 * OAuth start URL for a provider
 * Example:
 * https://<deployment>.convex.cloud/auth/vercel/start
 */
export function getOAuthStartUrl(provider: "vercel"): string {
  return `${getConvexHttpUrl()}/auth/${provider}/start`;
}
