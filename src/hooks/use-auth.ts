import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { getOAuthStartUrl } from "@/lib/convex-http.ts";

export function useAuth() {
  const currentUser = useQuery(api.users.getCurrentUser, {});

  const user = useMemo(() => {
    if (!currentUser) return null;
    return {
      profile: {
        name: currentUser.name ?? "User",
        email: currentUser.email ?? "",
      },
    };
  }, [currentUser]);

  return {
    user,
    isAuthenticated: Boolean(currentUser),
    isLoading: currentUser === undefined,
    error: undefined as unknown,
    signinRedirect: () => {
      window.location.href = getOAuthStartUrl("vercel");
    },
    signoutRedirect: () => {
      window.location.href = "/";
    },
  };
}

export function useUser() {
  return useAuth().user;
}
