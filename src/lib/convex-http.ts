// Normalize any misconfigured HTTP Actions URL (.convex.site) back to the Convex client URL (.convex.cloud).
function normalizeConvexUrl(url: string): string {
  if (url.includes(".convex.site")) {
    return url.replace(".convex.site", ".convex.cloud");
  }
  return url;
}

/**
 * Convex client base URL (Convex deployment)
 */
export function getConvexClientUrl(): string {
  const convexUrl = import.meta.env.VITE_CONVEX_URL;

  if (!convexUrl) {
    throw new Error(
      "VITE_CONVEX_URL is not defined. Check Vercel environment variables."
    );
  }

  return normalizeConvexUrl(convexUrl);
}

/**
 * Convex HTTP Actions base URL
 * HTTP actions are served on the `.convex.site` domain for a deployment.
 */
export function getConvexHttpActionsUrl(): string {
  const convexUrl = import.meta.env.VITE_CONVEX_URL;

  if (!convexUrl) {
    throw new Error(
      "VITE_CONVEX_URL is not defined. Check Vercel environment variables."
    );
  }

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
  return `${getConvexHttpActionsUrl()}/auth/${provider}/start`;
}
