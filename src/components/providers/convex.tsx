import { ConvexProvider as ConvexProviderBase, ConvexReactClient } from "convex/react";
import { getConvexHttpUrl } from "@/lib/convex-http.ts";

// Use the canonical Convex HTTP base (must be set in env). Never fall back to localhost in production.
const convexUrl = (() => {
  try {
    return getConvexHttpUrl();
  } catch (err) {
    // Surface a clear runtime error instead of silently pointing to localhost.
    console.error("VITE_CONVEX_URL is missing or invalid.", err);
    return "";
  }
})();

const convex = convexUrl ? new ConvexReactClient(convexUrl) : undefined;

export function ConvexProvider({ children }: { children: React.ReactNode }) {
  if (!convex) {
    return (
      <div className="flex items-center justify-center min-h-screen text-sm text-red-300">
        Convex client is not configured. Please set VITE_CONVEX_URL to your
        Convex deployment URL.
      </div>
    );
  }

  return (
    <ConvexProviderBase client={convex}>
      {children}
    </ConvexProviderBase>
  );
}
