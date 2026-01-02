import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { getConvexClientUrl } from "@/lib/convex-http.ts";

function normalizeConvexClientUrl(url: string): string {
  // Convex client must point at the .convex.cloud deployment URL.
  if (url.includes(".convex.site")) {
    console.warn(
      "VITE_CONVEX_URL points to .convex.site; normalizing to .convex.cloud for the Convex client."
    );
    return url.replace(".convex.site", ".convex.cloud");
  }
  return url;
}

// Use the canonical Convex base (must be set in env). Never fall back to localhost in production.
const convexUrl = (() => {
  try {
    return normalizeConvexClientUrl(getConvexClientUrl());
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
    <ConvexProviderWithClerk client={convex} useAuth={useClerkAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
