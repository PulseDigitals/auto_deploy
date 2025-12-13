import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Plus, Shield, Rocket } from "lucide-react";
import ProjectList from "@/features/projects/ProjectList.tsx";
import NewProjectForm from "@/features/projects/NewProjectForm.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";

export default function Projects() {
  const [showNewProject, setShowNewProject] = useState(false);

  const projects = useQuery(api.projects.listProjectsByUser, {});
  const isAdmin = useQuery(api.users.isCurrentUserAdmin, {});
  const systemProject = useQuery(api.projects.getSystemProject, {});

  const toggleAdmin = useMutation(api.users.toggleAdminStatus);
  const initializeSystem = useMutation(api.projects.initializeSystemProject);

  const handleToggleAdmin = async () => {
    try {
      const result = await toggleAdmin({});
      toast.success(result.isAdmin ? "Admin mode enabled" : "Admin mode disabled");
    } catch (error) {
      toast.error("Failed to toggle admin status");
    }
  };

  const handleInitializeSystem = async () => {
    try {
      await initializeSystem({});
      toast.success("System project initialized");
    } catch (error) {
      toast.error("Failed to initialize system project");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-2">
            Manage your deployment projects
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleToggleAdmin} variant="outline" className="gap-2">
            <Shield className="h-4 w-4" />
            {isAdmin ? "Disable" : "Enable"} Admin
          </Button>
          <Button onClick={() => setShowNewProject(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {isAdmin && (
        <Card className="border-amber-500/50 bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              System Administration
              <Badge variant="outline" className="ml-2 border-amber-500 text-amber-500">
                Admin Only
              </Badge>
            </CardTitle>
            <CardDescription>
              Manage system-level projects and self-deployment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!systemProject ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">System Project</p>
                  <p className="text-xs text-muted-foreground">
                    Initialize the system project for self-deployment
                  </p>
                </div>
                <Button onClick={handleInitializeSystem} size="sm" className="gap-2">
                  <Rocket className="h-4 w-4" />
                  Initialize
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{systemProject.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {systemProject.description}
                    </p>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Shield className="h-3 w-3" />
                    System
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Provider: {systemProject.providerPreference} · Environment: {systemProject.environment}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ProjectList projects={projects} />

      <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <NewProjectForm onSuccess={() => setShowNewProject(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
