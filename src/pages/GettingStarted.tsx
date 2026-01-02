import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Download, CheckCircle, AlertCircle, Rocket, Upload, Github, Settings, Zap } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function GettingStarted() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    alert("PDF generation is temporarily disabled.");
    setIsGenerating(false);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Getting Started Guide</h1>
          <p className="mt-2 text-slate-400">Everything you need to deploy your first app in 5 minutes</p>
        </div>
        <Button onClick={generatePDF} disabled={isGenerating} size="lg">
          {isGenerating ? (
            "Generating..."
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </>
          )}
        </Button>
      </div>

      <Card className="border-indigo-500/50 bg-indigo-500/10">
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500">
            <Rocket className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-indigo-300">Ready to deploy?</h3>
            <p className="text-sm text-slate-400">Follow these steps to get your first app live in minutes</p>
          </div>
          <Link to="/dashboard/projects">
            <Button>Start Deploying</Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            1. What You Need
          </CardTitle>
          <CardDescription>Make sure you have these ready before starting</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 text-green-500" />
            <div>
              <p className="font-medium">1-Click auto Deploy Account</p>
              <p className="text-sm text-slate-400">Free signup - you're already logged in!</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 text-green-500" />
            <div>
              <p className="font-medium">Vercel Account</p>
              <p className="text-sm">Sign up free at vercel.com</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 text-green-500" />
            <div>
              <p className="font-medium">Your Project Code</p>
              <p className="text-sm text-slate-400">ZIP file or GitHub repository with package.json</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-indigo-500" />
            2. Quick Setup (5 Minutes)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[
              {
                step: "1",
                title: "Connect Your Vercel Account",
                description: "Go to Settings and click 'Connect Vercel' to complete the OAuth flow",
                icon: <Zap className="h-5 w-5" />,
                link: "/dashboard/settings",
              },
              {
                step: "2",
                title: "Select Your Team",
                description: "Choose your personal or team workspace from the dropdown",
                icon: <CheckCircle className="h-5 w-5" />,
              },
              {
                step: "3",
                title: "Create Your First Project",
                description: "Go to Projects page and click 'Create New Project'",
                icon: <Upload className="h-5 w-5" />,
                link: "/dashboard/projects",
              },
              {
                step: "4",
                title: "Upload Your Code",
                description: "Upload a ZIP file or connect a GitHub repository",
                icon: <Github className="h-5 w-5" />,
              },
              {
                step: "5",
                title: "Deploy!",
                description: "Click 'Create & Deploy Project' and watch your app go live",
                icon: <Rocket className="h-5 w-5" />,
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">
                    Step {item.step}: {item.title}
                  </h4>
                  <p className="text-sm text-slate-400">{item.description}</p>
                  {item.link && (
                    <Link to={item.link}>
                      <Button variant="link" className="h-auto p-0 text-xs">
                        Go to {item.title.split(" ")[0]}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Project Requirements</CardTitle>
          <CardDescription>Your project must include these essentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="mb-2 font-semibold">Required: package.json</h4>
            <div className="rounded-lg bg-slate-900 p-4 font-mono text-sm">
              <pre className="text-slate-300">{`{
  "name": "my-app",
  "version": "1.0.0",
  "scripts": {
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.0.0",
    "vite": "^5.0.0"
  }
}`}</pre>
            </div>
          </div>

          <div>
            <h4 className="mb-2 font-semibold">Supported Frameworks</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                "Vite / React",
                "Next.js",
                "Vue",
                "Svelte / SvelteKit",
                "Angular",
                "Astro",
                "Remix",
                "Nuxt",
              ].map((framework) => (
                <div key={framework} className="flex items-center gap-2 rounded-lg border border-slate-800 p-3">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{framework}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4. Deployment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-800 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Upload className="h-5 w-5 text-indigo-400" />
                <h4 className="font-semibold">ZIP Upload (Easiest)</h4>
              </div>
              <ol className="space-y-2 text-sm text-slate-400">
                <li>1. Export your project as ZIP (exclude node_modules)</li>
                <li>2. Go to Projects and create a new project</li>
                <li>3. Enter name and upload ZIP</li>
                <li>4. Click "Create & Deploy"</li>
              </ol>
            </div>

            <div className="rounded-lg border border-slate-800 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Github className="h-5 w-5 text-indigo-400" />
                <h4 className="font-semibold">GitHub Repository</h4>
              </div>
              <ol className="space-y-2 text-sm text-slate-400">
                <li>1. Push your code to GitHub</li>
                <li>2. Go to Auto-Deploy page</li>
                <li>3. Paste GitHub URL</li>
                <li>4. Click "Deploy from GitHub"</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            5. Troubleshooting Common Issues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                problem: '"package.json not found"',
                solution: "Ensure package.json is at the root of your ZIP, not in a subfolder",
              },
              {
                problem: '"Vercel Not Connected"',
                solution: "Go to Settings and click 'Connect Vercel' to complete OAuth",
              },
              {
                problem: "Build fails with npm install error",
                solution: "Check your package.json for syntax errors or invalid dependencies",
              },
              {
                problem: "Deploy button is disabled",
                solution: "Verify project name, ZIP upload, and Vercel connection",
              },
            ].map((issue, index) => (
              <div key={index} className="rounded-lg border border-slate-800 p-4">
                <p className="mb-2 font-semibold text-red-400">{issue.problem}</p>
                <p className="text-sm text-slate-400">Solution: {issue.solution}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>6. Deployment Limits by Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="pb-3 text-left">Feature</th>
                  <th className="pb-3 text-center">Free</th>
                  <th className="pb-3 text-center">Pro (/mo)</th>
                  <th className="pb-3 text-center">Business (/mo)</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-slate-800">
                  <td className="py-3">Deployments/month</td>
                  <td className="py-3 text-center text-slate-400">5</td>
                  <td className="py-3 text-center text-green-400">Unlimited</td>
                  <td className="py-3 text-center text-green-400">Unlimited</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-3">Build time</td>
                  <td className="py-3 text-center text-slate-400">15 min</td>
                  <td className="py-3 text-center text-slate-400">45 min</td>
                  <td className="py-3 text-center text-slate-400">45 min</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="py-3">Support</td>
                  <td className="py-3 text-center text-slate-400">Community</td>
                  <td className="py-3 text-center text-indigo-400">Priority</td>
                  <td className="py-3 text-center text-indigo-400">Dedicated</td>
                </tr>
                <tr>
                  <td className="py-3">Team members</td>
                  <td className="py-3 text-center text-slate-400">1</td>
                  <td className="py-3 text-center text-slate-400">1</td>
                  <td className="py-3 text-center text-green-400">5+</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-center">
            <Link to="/dashboard/pricing">
              <Button>View Pricing Details</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card className="border-indigo-500/50 bg-indigo-500/10">
        <CardContent className="py-8 text-center">
          <h3 className="mb-2 text-xl font-bold">Ready to Deploy?</h3>
          <p className="mb-6 text-slate-400">Start deploying your applications in minutes</p>
          <div className="flex justify-center gap-4">
            <Link to="/dashboard/projects">
              <Button size="lg">
                <Rocket className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </Link>
            <Button size="lg" variant="outline" onClick={generatePDF}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF Guide
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
