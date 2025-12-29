import { useMemo } from "react";
import { useAuth as useClerkAuth, useUser as useClerkUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert.tsx";
import { Badge } from "../ui/badge.tsx";
import { AuthConfirmationPanel } from "../AuthConfirmationPanel.tsx";

export function BackendAuthBanner() {
  const { isLoaded: clerkLoaded, isSignedIn } = useClerkAuth();
  const { user } = useClerkUser();
  const convexUser = useQuery(api.users.getCurrentUser, {});
  const whoami = useQuery(api.authDebug.whoami, {});
  const debugWho = useQuery(api.usersDebug.getMe, {});

  const { showDebug, showConfirm } = useMemo(() => {
    if (typeof window === "undefined") {
      return { showDebug: false, showConfirm: false };
    }
    const searchParams = new URLSearchParams(window.location.search);
    return {
      showDebug: searchParams.get("debugAuth") === "1",
      showConfirm: searchParams.get("confirmAuth") === "1",
    };
  }, []);

  const missingConvexIdentity = clerkLoaded && isSignedIn && convexUser === null;
  const showBanner = missingConvexIdentity;

  if (!showBanner && !showDebug && !showConfirm) return null;

  return (
    <div className="mb-4 space-y-2">
      {showBanner && (
        <Alert variant="warning">
          <AlertTitle>Backend auth not established</AlertTitle>
          <AlertDescription>
            You are signed in as {user?.primaryEmailAddress?.emailAddress ?? "user"}, but Convex has not
            established a session yet. This should clear after auth is verified.
          </AlertDescription>
        </Alert>
      )}

      {showDebug && (
        <div className="rounded-md border border-dashed p-3 text-sm space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Auth Debug</Badge>
            <span className="text-muted-foreground">(safe: no tokens shown)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="font-medium">Clerk</div>
              <div>isSignedIn: {String(isSignedIn)}</div>
              <div>clerkUserId: {user?.id ?? "n/a"}</div>
            </div>
            <div className="space-y-1">
              <div className="font-medium">Convex</div>
              <div>hasIdentity: {String(whoami?.hasIdentity ?? false)}</div>
              <div>subject: {whoami?.subject ?? "n/a"}</div>
              <div>issuer: {whoami?.issuer ?? "n/a"}</div>
            </div>
            <div className="space-y-1 md:col-span-2">
              <div className="font-medium">User record</div>
              <div>_id: {debugWho?._id ?? "n/a"}</div>
              <div>clerkUserId: {debugWho?.clerkUserId ?? "n/a"}</div>
              <div>email: {debugWho?.email ?? "n/a"}</div>
            </div>
          </div>
        </div>
      )}

      {showConfirm && <AuthConfirmationPanel />}
    </div>
  );
}
