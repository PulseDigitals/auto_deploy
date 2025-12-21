import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Upload, Github, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function AutoDeployWizard() {
  const [projectName, setProjectName] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);

  const generateUploadUrl = useMutation(api.zipUpload.generateUploadUrl);
  const createAutoDeployment = useMutation(api.autoDeployment.createAutoDeployment);
  const triggerAutoDeployment = useMutation(api.autoDeploymentTrigger.triggerAutoDeployment);
  const vercelConnection = useQuery(api.vercelConnections.getVercelConnection);

  const isVercelConnected = vercelConnection?.hasToken || false;

  const handleZipDeploy = async () => {
    if (!projectName || !zipFile) {
      toast.error("Please provide project name and ZIP file");
      return;
    }

    setIsDeploying(true);
    try {
      // Step 1: Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Step 2: Upload the ZIP file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": zipFile.type },
        body: zipFile,
      });

      const { storageId } = await result.json();

      // Step 3: Create deployment
      const deploymentId = await createAutoDeployment({
        projectName,
        provider: "Vercel",
        source: "zip",
        sourceStorageId: storageId,
      });

      // Step 4: Trigger deployment
      await triggerAutoDeployment({ deploymentId });

      toast.success("Deployment started! Check the Deployments page for progress.");
      
      // Reset form
      setProjectName("");
      setZipFile(null);
      
    } catch (error) {
      console.error("Deployment error:", error);
      toast.error("Failed to start deployment");
    } finally {
      setIsDeploying(false);
    }
  };

  const handleGitHubDeploy = async () => {
    if (!projectName || !githubUrl) {
      toast.error("Please provide project name and GitHub URL");
      return;
    }

    setIsDeploying(true);
    try {
      // Create deployment
      const deploymentId = await createAutoDeployment({
        projectName,
        provider: "Vercel",
        source: "github",
        sourceGitHubUrl: githubUrl,
      });

      // Trigger deployment
      await triggerAutoDeployment({ deploymentId });

      toast.success("Deployment started! Check the Deployments page for progress.");
      
      // Reset form
      setProjectName("");
      setGithubUrl("");
      
    } catch (error) {
      console.error("Deployment error:", error);
      toast.error("Failed to start deployment");
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Auto-Deploy to Vercel</h1>
        <p className="text-slate-400">
          Deploy your application to Vercel from a ZIP file or GitHub repository
        </p>
      </div>

      {!isVercelConnected && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-300 mb-1">Vercel Not Connected</h3>
            <p className="text-sm text-slate-400 mb-2">
              You need to connect your Vercel account before you can deploy.
            </p>
            <Link
              to="/dashboard/settings"
              className="text-sm text-amber-400 hover:text-amber-300 underline"
            >
              Go to Settings to connect Vercel →
            </Link>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Choose Deployment Source</CardTitle>
          <CardDescription>
            Select how you want to provide your application code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="zip" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="zip">
                <Upload className="h-4 w-4 mr-2" />
                ZIP Upload
              </TabsTrigger>
              <TabsTrigger value="github">
                <Github className="h-4 w-4 mr-2" />
                GitHub Repository
              </TabsTrigger>
            </TabsList>

            <TabsContent value="zip" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="zip-project-name">Project Name</Label>
                <Input
                  id="zip-project-name"
                  placeholder="my-awesome-app"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip-file">Upload ZIP File</Label>
                <Input
                  id="zip-file"
                  type="file"
                  accept=".zip"
                  onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                />
                {zipFile && (
                  <p className="text-xs text-slate-400">
                    Selected: {zipFile.name} ({(zipFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <Button
                onClick={handleZipDeploy}
                disabled={!projectName || !zipFile || isDeploying || !isVercelConnected}
                className="w-full"
              >
                {isDeploying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Deploy from ZIP
                  </>
                )}
              </Button>
              {(!projectName || !zipFile || !isVercelConnected) && !isDeploying && (
                <p className="text-xs text-slate-400 mt-2">
                  {!isVercelConnected ? "⚠️ Connect Vercel first" : 
                   !projectName ? "⚠️ Enter project name" : 
                   !zipFile ? "⚠️ Select ZIP file" : ""}
                </p>
              )}
            </TabsContent>

            <TabsContent value="github" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="github-project-name">Project Name</Label>
                <Input
                  id="github-project-name"
                  placeholder="my-awesome-app"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="github-url">GitHub Repository URL</Label>
                <Input
                  id="github-url"
                  placeholder="https://github.com/yourusername/your-repo"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                />
                <p className="text-xs text-slate-400">
                  Make sure the repository is public or you've given Vercel access
                </p>
              </div>

              <Button
                onClick={handleGitHubDeploy}
                disabled={!projectName || !githubUrl || isDeploying || !isVercelConnected}
                className="w-full"
              >
                {isDeploying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Github className="h-4 w-4 mr-2" />
                    Deploy from GitHub
                  </>
                )}
              </Button>
              {(!projectName || !githubUrl || !isVercelConnected) && !isDeploying && (
                <p className="text-xs text-slate-400 mt-2">
                  {!isVercelConnected ? "⚠️ Connect Vercel first" : 
                   !projectName ? "⚠️ Enter project name" : 
                   !githubUrl ? "⚠️ Enter GitHub URL" : ""}
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-slate-900 border border-slate-800 rounded-lg">
        <h3 className="font-semibold mb-2">💡 How It Works</h3>
        <ul className="text-sm text-slate-400 space-y-2">
          <li><strong className="text-slate-300">ZIP Upload:</strong> Your entire codebase is extracted and deployed to Vercel with full build support (npm install, build commands, etc.)</li>
          <li><strong className="text-slate-300">GitHub Repo:</strong> Vercel connects directly to your repository for continuous deployment on every push</li>
          <li><strong className="text-slate-300">Build Process:</strong> Both pathways support full Vite builds with all dependencies</li>
          <li><strong className="text-slate-300">Status Tracking:</strong> Watch real-time logs in the Deployments page</li>
        </ul>
      </div>

      <div className="mt-4 p-4 bg-slate-900 border border-slate-800 rounded-lg">
        <h3 className="font-semibold mb-2">📝 Requirements</h3>
        <ul className="text-sm text-slate-400 space-y-1">
          <li>• ZIP file must contain package.json at the root level</li>
          <li>• GitHub repos must be public or connected to your Vercel account</li>
          <li>• Project names should be lowercase with hyphens (a-z, 0-9, -)</li>
          <li>• Deployments typically take 2-5 minutes depending on build size</li>
        </ul>
      </div>
    </div>
  );
}
