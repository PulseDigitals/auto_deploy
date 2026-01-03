import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserProfile, useAuth as useClerkAuth } from "@clerk/clerk-react";

/**
 * Self-hosted account/profile page.
 * Shows Clerk's <UserProfile/> and auto-redirects back to the dashboard after 2 seconds
 * once the user is signed in. Keeps users on our domain for full UX control.
 */
export default function Account() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useClerkAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const timer = setTimeout(() => {
      navigate("/dashboard", { replace: true });
    }, 2000);
    return () => clearTimeout(timer);
  }, [isLoaded, isSignedIn, navigate]);

  return (
    <div className="flex justify-center py-8">
      <div className="w-full max-w-3xl bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <UserProfile
          routing="path"
          path="/account"
          appearance={{
            elements: {
              formButtonPrimary:
                "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700",
            },
          }}
        />
      </div>
    </div>
  );
}
