import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useAuth } from "@/hooks/use-auth.ts";
import { Button } from "@/components/ui/button.tsx";
import { Plus } from "lucide-react";
import ProjectList from "@/features/projects/ProjectList.tsx";
import NewProjectForm from "@/features/projects/NewProjectForm.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";

export default function Projects() {
  const { user } = useAuth();
  const userId = user?.profile.sub || "demo";
  const [showNewProject, setShowNewProject] = useState(false);

  const projects = useQuery(api.projects.listProjectsByUser, { userId });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-2">
            Manage your deployment projects
          </p>
        </div>
        <Button onClick={() => setShowNewProject(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      <ProjectList projects={projects} />

      <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <NewProjectForm
            userId={userId}
            onSuccess={() => setShowNewProject(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
