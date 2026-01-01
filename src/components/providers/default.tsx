import { ConvexProvider } from "./convex.tsx";
import { QueryClientProvider } from "./query-client.tsx";
import { ThemeProvider } from "./theme.tsx";
import { Toaster } from "../ui/sonner.tsx";
import { TooltipProvider } from "../ui/tooltip.tsx";
import { ClerkProvider } from "@clerk/clerk-react";

export function DefaultProviders({ children }: { children: React.ReactNode }) {
  const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!clerkPublishableKey) {
    return (
      <div className="flex items-center justify-center min-h-screen text-sm text-red-300">
        Missing VITE_CLERK_PUBLISHABLE_KEY. Please set your Clerk publishable key
        in the environment variables.
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <ConvexProvider>
        <QueryClientProvider>
          <TooltipProvider>
            <ThemeProvider>
              <Toaster />
              {children}
            </ThemeProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </ConvexProvider>
    </ClerkProvider>
  );
}
