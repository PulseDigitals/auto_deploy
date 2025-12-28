import { ConvexProvider as ConvexProviderBase, ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL ?? "http://localhost:3000";
const convex = new ConvexReactClient(convexUrl);

export function ConvexProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderBase client={convex}>
      {children}
    </ConvexProviderBase>
  );
}
