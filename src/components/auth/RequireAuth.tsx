import { Navigate, useLocation } from "react-router-dom";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";

type Props = {
  children: JSX.Element;
};

export function RequireAuth({ children }: Props) {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const location = useLocation();

  // While Clerk is loading, show a simple placeholder to avoid flicker
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-300 text-sm">
        Loading…
      </div>
    );
  }

  if (!isSignedIn) {
    // Gate all protected routes; unauthenticated users always go to landing
    return <Navigate to="/" replace />;
  }

  return children;
}
