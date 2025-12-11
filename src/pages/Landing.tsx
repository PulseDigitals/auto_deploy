import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { Rocket, Zap, Shield, Globe } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Hero Section */}
      <div className="container mx-auto px-6 pt-20 pb-32">
        <div className="text-center max-w-4xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm">
            <Zap className="h-4 w-4 text-primary" />
            <span>AI-Powered Deployment Platform</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-balance">
            Deploy Your Apps with
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
              AI Intelligence
            </span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto text-balance">
            Upload your codebase, let AI analyze it, and deploy to any cloud
            provider in seconds. No configuration required.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/dashboard">
              <Button size="lg" className="gap-2">
                <Rocket className="h-5 w-5" />
                Get Started
              import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center text-center py-20">
      {/* ...title and text... */}

      <button
        onClick={() => navigate("/dashboard")}
        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
      >
        Get Started
      </button>
    </div>
  );
}

            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-5xl mx-auto">
          <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
            <div className="h-12 w-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
              <Zap className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Instant Analysis</h3>
            <p className="text-slate-400">
              AI automatically detects your framework, dependencies, and build
              configuration.
            </p>
          </div>

          <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
            <div className="h-12 w-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Secure by Default</h3>
            <p className="text-slate-400">
              Enterprise-grade security with automated SSL, DDoS protection, and
              compliance.
            </p>
          </div>

          <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
            <div className="h-12 w-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
              <Globe className="h-6 w-6 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Multi-Cloud</h3>
            <p className="text-slate-400">
              Deploy to AWS, GCP, Azure, or any cloud provider with one click.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
