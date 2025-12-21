import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { toast } from "sonner";
import { Loader2, Upload, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface NewProjectFormProps {
  onSuccess: () => void;
}

export default function NewProjectForm({ onSuccess }: NewProjectFormProps) {
  const [name, setName] = useState("");
  const [gitRepoUrl, setGitRepoUrl] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const createProject = useMutation(api.projects.createProject);
  const generateUploadUrl = useMutation(api.zipUpload.generateUploadUrl);
  const createAutoDeployment = useMutation(api.autoDeployment.createAutoDeployment);
  const triggerAutoDeployment = useMutation(api.autoDeploymentTrigger.triggerAutoDeployment);
  const vercelConnection = useQuery(api.vercelConnections.getVercelConnection);

  const isVercelConnected = vercelConnection?.hasToken || false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    setIsLoading(true);

    try {
      // If ZIP file is provided and Vercel is connected, deploy it
      if (zipFile && isVercelConnected) {
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
          projectName: name.trim(),
          provider: "Vercel",
          source: "zip",
          sourceStorageId: storageId,
        });

        // Step 4: Trigger deployment
        await triggerAutoDeployment({ deploymentId });

        toast.success("Project created and deployment started! Check the Deployments page for progress.");
      } else {
        // Standard project creation without deployment
        await createProject({
          name: name.trim(),
          gitRepoUrl: gitRepoUrl.trim() || undefined,
        });

        toast.success("Project created successfully!");
      }

      // Reset form
      setName("");
      setGitRepoUrl("");
      setZipFile(null);
      onSuccess();
    } catch (error) {
      console.error("Failed to create project:", error);
      toast.error(zipFile ? "Failed to deploy project" : "Failed to create project");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Project Name *</Label>
        <Input
          id="name"
          placeholder="my-awesome-app"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gitRepoUrl">GitHub Repository URL (Optional)</Label>
        <Input
          id="gitRepoUrl"
          type="url"
          placeholder="https://github.com/username/repo"
          value={gitRepoUrl}
          onChange={(e) => setGitRepoUrl(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="zipFile">Upload ZIP File (Optional)</Label>
        <Input
          id="zipFile"
          type="file"
          accept=".zip"
          onChange={(e) => setZipFile(e.target.files?.[0] || null)}
          disabled={isLoading}
        />
        {zipFile && (
          <p className="text-xs text-slate-400">
            Selected: {zipFile.name} ({(zipFile.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
        <p className="text-xs text-slate-500">
          Upload a ZIP file to deploy your entire codebase to Vercel with full build support
        </p>
      </div>

      {zipFile && !isVercelConnected && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-300 mb-1">
              Vercel Not Connected
            </p>
            <p className="text-xs text-slate-400 mb-2">
              Connect Vercel to deploy your ZIP file. Without Vercel, the project will be created but not deployed.
            </p>
            <Link
              to="/dashboard/settings"
              className="text-xs text-amber-400 hover:text-amber-300 underline"
            >
              Go to Settings to connect Vercel →
            </Link>
          </div>
        </div>
      )}

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {zipFile && isVercelConnected ? (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Create & Deploy Project
          </>
        ) : (
          "Create Project"
        )}
      </Button>

      {!zipFile && (
        <p className="text-xs text-center text-slate-500">
          Or <Link to="/dashboard/auto-deploy" className="text-indigo-400 hover:text-indigo-300 underline">deploy from GitHub</Link>
        </p>
      )}
    </form>
  );
}
