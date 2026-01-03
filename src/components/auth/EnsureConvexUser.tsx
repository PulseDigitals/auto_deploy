import { useEffect, useRef } from "react";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";

/**
 * Ensures the authenticated Clerk user is upserted in Convex.
 * Additive and non-breaking: if already present, it’s a no-op.
 */
export function EnsureConvexUser() {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const updateCurrentUser = useMutation(api.users.updateCurrentUser);
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      hasSyncedRef.current = false;
      return;
    }
    if (hasSyncedRef.current) return;
    hasSyncedRef.current = true;

    // Fire-and-forget; errors are handled in the server mutation.
    void updateCurrentUser({});
  }, [isLoaded, isSignedIn, updateCurrentUser]);

  return null;
}
