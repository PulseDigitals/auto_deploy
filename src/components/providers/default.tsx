import { ConvexProvider } from "./convex.tsx";
import { QueryClientProvider } from "./query-client.tsx";
import { ThemeProvider } from "./theme.tsx";
import { Toaster } from "../ui/sonner.tsx";
import { TooltipProvider } from "../ui/tooltip.tsx";
import { ClerkProvider } from "@clerk/clerk-react";
import { EnsureConvexUser } from "../auth/EnsureConvexUser.tsx";

export function DefaultProviders({ children }: { children: React.ReactNode }) {
  // Accept either Vite or Next-style env naming to avoid missing key at runtime.
  const clerkPublishableKey =
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
    import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  // Always send users to the dashboard after auth; use absolute URL to avoid Clerk-hosted fallback
  const dashboardRedirect =
    typeof window !== "undefined"
      ? `${window.location.origin}/dashboard`
      : "/dashboard";

  if (!clerkPublishableKey) {
    return (
      <div className="flex items-center justify-center min-h-screen text-sm text-red-300">
        Missing VITE_CLERK_PUBLISHABLE_KEY. Please set your Clerk publishable key
        in the environment variables.
      </div>
    );
  }

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      // Direct post-auth routing to the dashboard
      redirectUrl={dashboardRedirect}
    >
      <ConvexProvider>
        <QueryClientProvider>
          <TooltipProvider>
            <ThemeProvider>
              <Toaster />
              <EnsureConvexUser />
              {children}
            </ThemeProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </ConvexProvider>
    </ClerkProvider>
  );
}
