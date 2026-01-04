import { SignIn } from "@clerk/clerk-react";

// Dedicated sign-in page to satisfy Clerk sign_in_url and keep users on our domain.
// Uses absolute redirect to dashboard after successful auth.
export default function SignInPage() {
  const redirect =
    typeof window !== "undefined"
      ? `${window.location.origin}/dashboard`
      : "/dashboard";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md bg-slate-900/70 border border-slate-800 rounded-xl p-6">
        <SignIn
          routing="path"
          path="/sign-in"
          redirectUrl={redirect}
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
