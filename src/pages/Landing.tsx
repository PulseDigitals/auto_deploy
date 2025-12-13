import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { ArrowRight, Zap, Shield, Rocket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20">
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
              <Button
                size="lg"
                onClick={() => navigate("/dashboard")}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white gap-2"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/pricing")}
              >
                View Pricing
              </Button>
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
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-3xl blur-3xl"></div>
            <img
              src="https://cdn.hercules.app/file_zaOoH9OMJ9bt7J8rlG554M48"
              alt="From Build to Live - Auto Deploy in One Click"
              className="relative rounded-2xl shadow-2xl border border-green-500/20"
            />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">
          Why Choose AI Deploy Agent
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
