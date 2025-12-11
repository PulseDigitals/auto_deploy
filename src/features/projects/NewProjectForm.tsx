import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";

interface NewProjectFormProps {
  userId: string;
  onSuccess: () => void;
}

export default function NewProjectForm({
  userId,
  onSuccess,
}: NewProjectFormProps) {
  const [name, setName] = useState("");
  const [gitRepoUrl, setGitRepoUrl] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const createProject = useMutation(api.projects.createProject);
  const uploadZipMetadata = useMutation(api.zipUpload.uploadZipMetadata);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    setIsLoading(true);

    try {
      // Create the project
      const projectId = await createProject({
        userId,
        name: name.trim(),
        gitRepoUrl: gitRepoUrl.trim() || undefined,
      });

      // If a ZIP file was selected, upload metadata (MVP stub)
      if (zipFile) {
        await uploadZipMetadata({
          projectId,
          fileName: zipFile.name,
          size: zipFile.size,
        });
        toast.success(
          "Project created! ZIP received; AI analysis stubbed for now."
        );
      } else {
        toast.success("Project created successfully!");
      }

      // Reset form
      setName("");
      setGitRepoUrl("");
      setZipFile(null);
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

      <div className="space-y-2">
        <Label htmlFor="zipFile">
          Upload ZIP File (Optional - MVP stub)
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="zipFile"
            type="file"
            accept=".zip"
            onChange={(e) => setZipFile(e.target.files?.[0] || null)}
            disabled={isLoading}
            className="cursor-pointer"
          />
          {zipFile && <Upload className="h-4 w-4 text-green-500" />}
        </div>
        <p className="text-xs text-muted-foreground">
          MVP: Only metadata is uploaded. Full ZIP extraction and AI manifest
          generation coming soon.
        </p>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create Project
      </Button>
    </form>
  );
}
