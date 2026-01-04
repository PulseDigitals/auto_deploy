import { useMemo } from "react";
import { useClerk, useAuth as useClerkAuth, useUser as useClerkUser } from "@clerk/clerk-react";

export function useAuth() {
  const { isSignedIn, isLoaded, signOut } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();
  const { redirectToSignIn } = useClerk();

  const user = useMemo(() => {
    if (!clerkUser) return null;
    const email =
      clerkUser.primaryEmailAddress?.emailAddress ||
      clerkUser.emailAddresses?.[0]?.emailAddress ||
      "";
    const name =
      clerkUser.fullName ||
      clerkUser.username ||
      email ||
      clerkUser.id;
    return {
      profile: {
        name,
        email,
      },
    };
  }, [clerkUser]);

  return {
    user,
    isAuthenticated: Boolean(isSignedIn),
    isLoading: !isLoaded,
    error: undefined as unknown,
    signinRedirect: () => {
      const returnTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/dashboard`
          : "/dashboard";
      redirectToSignIn({ redirectUrl: returnTo });
    },
    signoutRedirect: () => {
      signOut();
    },
  };
}

export function useUser() {
  return useAuth().user;
}
