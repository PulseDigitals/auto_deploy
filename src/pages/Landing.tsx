import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { ArrowRight, Zap, Shield, Rocket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  useClerk,
  useAuth as useClerkAuth,
  SignedIn,
  SignedOut,
  SignIn,
  SignUp,
} from "@clerk/clerk-react";

export default function Landing() {
  const navigate = useNavigate();
  const { redirectToSignIn, redirectToSignUp } = useClerk();
  const { isSignedIn, isLoaded } = useClerkAuth();

  const forceRedirect = "/dashboard";

  const handleSignIn = () => {
    redirectToSignIn({ forceRedirectUrl: forceRedirect });
  };

  const handleSignUp = () => {
    redirectToSignUp({ forceRedirectUrl: forceRedirect });
  };

  const handleGoToApp = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header/Navbar */}
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <img 
            src="https://cdn.hercules.app/file_VyVWXRitxQHVzP57VWFwDRyQ" 
            alt="1-Click auto Deploy" 
            className="h-20 w-auto"
          />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/pricing")}>
              Pricing
            </Button>
            {isLoaded && isSignedIn ? (
              <Button
                onClick={handleGoToApp}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                Go to Dashboard
              </Button>
            ) : (
              <Button
                onClick={handleSignIn}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-left space-y-6">
            <div className="inline-block px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full text-green-400 text-sm font-medium mb-4">
              ✨ AI-Powered Deployment Platform
            </div>
            
            <h1 className="text-6xl font-bold leading-tight">
              Deploy Your Apps with{" "}
              <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                AI Intelligence
              </span>
            </h1>
            
            <p className="text-xl text-slate-400 leading-relaxed max-w-xl">
              Upload your codebase, let AI analyze it, and deploy to any cloud provider instantly.
              From build to live in one click.
            </p>

            <div className="flex gap-4 pt-4">
              {isLoaded && isSignedIn ? (
                <Button
                  size="lg"
                  onClick={handleGoToApp}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white gap-2"
                >
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={handleSignIn}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white gap-2"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              {!(isLoaded && isSignedIn) && (
                <Button size="lg" variant="outline" onClick={handleSignUp}>
                  Create Account
                </Button>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div>
                <div className="text-3xl font-bold text-green-400">99.9%</div>
                <div className="text-sm text-slate-400">Uptime</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-400">&lt;60s</div>
                <div className="text-sm text-slate-400">Deploy Time</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-400">5+</div>
                <div className="text-sm text-slate-400">Providers</div>
              </div>
            </div>
          </div>

          {/* Right - Hero Image */}
          <div className="relative space-y-6">
            {/* Text Above Image */}
            <div className="text-center">
              <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-white tracking-wide leading-tight">
                FROM BUILD TO LIVE
              </h2>
              <p className="text-sm md:text-base lg:text-lg font-bold text-green-400 tracking-wide mt-1">
                AUTO DEPLOY
              </p>
              <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-white tracking-wide leading-tight mt-1">
                IN ONE CLICK
              </h2>
            </div>
            
            {/* Image */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-3xl blur-3xl"></div>
              <div className="relative rounded-2xl shadow-2xl border border-green-500/20 overflow-hidden">
                <img
                  src="https://cdn.hercules.app/file_IGFksD2ZqPMtAl0ttUDaSZ4O"
                  alt="From Build to Live - Auto Deploy in One Click"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">
          Why Choose 1-Click auto Deploy
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
              <p className="text-slate-400">
                Deploy in under 60 seconds with intelligent optimization and automated workflows.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Enterprise Security</h3>
              <p className="text-slate-400">
                Bank-level encryption, secure token storage, and compliance-ready infrastructure.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-4">
                <Rocket className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Multi-Provider</h3>
              <p className="text-slate-400">
                Deploy to Vercel, Netlify, Render, Railway, or AWS with a single platform.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Auth Section (Sign In / Sign Up) */}
      <div className="container mx-auto px-6 py-12 max-w-5xl">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <Card className="bg-slate-900/60 border-slate-800">
            <CardContent className="pt-6">
              <h3 className="text-xl font-semibold mb-4">Sign In</h3>
              <SignedOut>
                <SignIn
                  routing="path"
                  path="/"
                  forceRedirectUrl="/dashboard"
                  appearance={{
                    elements: {
                      formButtonPrimary:
                        "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700",
                    },
                  }}
                />
              </SignedOut>
              <SignedIn>
                <div className="text-sm text-green-400">You are already signed in.</div>
              </SignedIn>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800">
            <CardContent className="pt-6">
              <h3 className="text-xl font-semibold mb-4">Create Account</h3>
              <SignedOut>
                <SignUp
                  routing="path"
                  path="/"
                  forceRedirectUrl="/dashboard"
                  appearance={{
                    elements: {
                      formButtonPrimary:
                        "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700",
                    },
                  }}
                />
              </SignedOut>
              <SignedIn>
                <div className="text-sm text-green-400">You already have access.</div>
              </SignedIn>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-6 py-20">
        <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
          <CardContent className="pt-12 pb-12 text-center">
            <h2 className="text-4xl font-bold mb-4">
              Ready to Deploy Smarter?
            </h2>
            <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
              Join thousands of developers shipping faster with AI-powered deployments.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/dashboard")}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white gap-2"
            >
              Start Deploying Now
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800">
        <div className="container mx-auto px-6 py-6">
          <p className="text-center text-sm text-slate-500">
            powered by{" "}
            <a
              href="https://pulsedigitals.online"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:text-green-300 transition-colors"
            >
              pulsedigitals.online
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
