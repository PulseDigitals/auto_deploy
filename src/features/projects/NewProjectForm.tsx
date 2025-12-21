import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { toast } from "sonner";
import { Loader2, Rocket } from "lucide-react";
import { Link } from "react-router-dom";

interface NewProjectFormProps {
  onSuccess: () => void;
}

export default function NewProjectForm({ onSuccess }: NewProjectFormProps) {
  const [name, setName] = useState("");
  const [gitRepoUrl, setGitRepoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const createProject = useMutation(api.projects.createProject);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    setIsLoading(true);

    try {
      // Create the project
      await createProject({
        name: name.trim(),
        gitRepoUrl: gitRepoUrl.trim() || undefined,
      });

      toast.success("Project created successfully!");

      // Reset form
      setName("");
      setGitRepoUrl("");
      onSuccess();
    } catch (error) {
      console.error("Failed to create project:", error);
      toast.error("Failed to create project");
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

      <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
        <div className="flex items-start gap-2">
          <Rocket className="h-4 w-4 text-indigo-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-indigo-300 mb-1">
              Want to deploy your codebase?
            </p>
            <p className="text-xs text-slate-400 mb-2">
              Upload ZIP files or connect GitHub repos with full build support
            </p>
            <Link
              to="/dashboard/auto-deploy"
              className="text-xs text-indigo-400 hover:text-indigo-300 underline"
            >
              Go to Auto-Deploy →
            </Link>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create Project
      </Button>
    </form>
  );
}
