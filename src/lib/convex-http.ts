/**
 * Get the Convex HTTP Actions base URL
 *
 * Convex HTTP actions are served on the SAME domain
 * as the Convex deployment (.convex.cloud)
 */
export function getConvexHttpUrl(): string {
  const convexUrl = import.meta.env.VITE_CONVEX_URL;

  if (!convexUrl) {
    throw new Error(
      "VITE_CONVEX_URL is not defined. Check Vercel environment variables."
    );
  }

  return convexUrl;
}

/**
 * Get the full OAuth start URL for a provider
 *
 * Example:
 * https://neighborly-herring-419.convex.cloud/auth/vercel/start
 */
export function getOAuthStartUrl(provider: "vercel"): string {
  return `${getConvexHttpUrl()}/auth/${provider}/start`;
}
