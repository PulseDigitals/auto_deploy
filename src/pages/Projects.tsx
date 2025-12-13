import { useState } from "react";
import { useQuery, useMutation, Authenticated, Unauthenticated, AuthLoading } from "convex/react";
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
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { toast } from "sonner";

function ProjectsContent() {
  const [showNewProject, setShowNewProject] = useState(false);
  const [showVersionInput, setShowVersionInput] = useState(false);
  const [newVersion, setNewVersion] = useState("");
  const [showDeployModal, setShowDeployModal] = useState(false);

  const projects = useQuery(api.projects.listProjectsByUser, {});
  const isAdmin = useQuery(api.users.isCurrentUserAdmin, {});
  const adminExistsData = useQuery(api.users.adminExists, {});
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const systemProject = useQuery(api.projects.getSystemProject, {});
  const platformVersion = useQuery(api.projects.getPlatformVersion, {});

  const bootstrapAdmin = useMutation(api.users.bootstrapAdmin);
  const toggleAdmin = useMutation(api.users.toggleAdminStatus);
  const initializeSystem = useMutation(api.projects.initializeSystemProject);
  const setLatestVersion = useMutation(api.projects.setLatestPlatformVersion);
  const triggerDeploy = useMutation(api.projects.triggerSelfDeploy);

  const handleBootstrapAdmin = async () => {
    try {
      await bootstrapAdmin({});
      toast.success("Admin initialized successfully");
    } catch (error) {
      // Handle specific error cases
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes("ADMIN_ALREADY_BOOTSTRAPPED") || errorMessage.includes("Admin already exists")) {
        toast.info("Admin already exists");
      } else if (errorMessage.includes("UNAUTHENTICATED")) {
        toast.error("Please log in to initialize admin");
      } else if (errorMessage.includes("USER_NOT_FOUND") || errorMessage.includes("User not found")) {
        toast.error("User account not found - please refresh and try again");
      } else {
        toast.error("Failed to initialize admin - please try again");
      }
      console.error("Bootstrap admin error:", error);
    }
  };

  const handleToggleAdmin = async () => {
    if (!currentUser?._id) {
      toast.error("User not found");
      return;
    }
    try {
      const result = await toggleAdmin({ userId: currentUser._id });
      toast.success(result.isAdmin ? "Admin mode enabled" : "Admin mode disabled");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes("FORBIDDEN")) {
        toast.error("Only admins can toggle admin status");
      } else if (errorMessage.includes("UNAUTHENTICATED")) {
        toast.error("Please log in to change admin status");
      } else {
        toast.error("Failed to toggle admin status");
      }
      console.error("Toggle admin error:", error);
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

  const handleSetNewVersion = async () => {
    if (!newVersion) {
      toast.error("Please enter a version");
      return;
    }
    try {
      await setLatestVersion({ version: newVersion });
      toast.success(`Latest version set to ${newVersion}`);
      setShowVersionInput(false);
      setNewVersion("");
    } catch (error) {
      toast.error("Failed to set version");
    }
  };

  const handleDeployPlatform = async () => {
    if (!systemProject) {
      toast.error("System project not found");
      return;
    }
    try {
      // Deploy to Vercel in simulation mode by default
      await triggerDeploy({
        provider: "Vercel",
        providerId: "vercel",
        mode: "simulation",
      });
      toast.success("Platform deployment started");
      setShowDeployModal(false);
    } catch (error) {
      toast.error("Failed to start deployment");
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
          {!adminExistsData?.exists ? (
            <Button onClick={handleBootstrapAdmin} variant="default" className="gap-2 border-amber-500 bg-amber-500 hover:bg-amber-600">
              <Shield className="h-4 w-4" />
              Initialize Admin
            </Button>
          ) : (
            <Button onClick={handleToggleAdmin} variant="outline" className="gap-2">
              <Shield className="h-4 w-4" />
              {isAdmin ? "Disable" : "Enable"} Admin
            </Button>
          )}
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
              <div className="space-y-4">
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

                {/* Platform Deployment Section */}
                {platformVersion && (
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Platform Deployment</p>
                      {platformVersion.updateAvailable ? (
                        <Badge variant="outline" className="border-amber-500 text-amber-500">
                          Update Available
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-500 text-green-500">
                          Up to Date
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Running Version</p>
                        <p className="font-mono">{platformVersion.currentVersion}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Latest Version</p>
                        <p className="font-mono">{platformVersion.latestAvailableVersion}</p>
                      </div>
                    </div>

                    {platformVersion.lastSelfDeployAt && (
                      <p className="text-xs text-muted-foreground">
                        Last deployed: {new Date(platformVersion.lastSelfDeployAt).toLocaleString()}
                      </p>
                    )}

                    <div className="flex gap-2">
                      {platformVersion.updateAvailable && (
                        <Button onClick={handleDeployPlatform} size="sm" className="gap-2">
                          <Rocket className="h-4 w-4" />
                          Deploy Platform Update
                        </Button>
                      )}
                      <Button 
                        onClick={() => setShowVersionInput(!showVersionInput)} 
                        variant="outline" 
                        size="sm"
                      >
                        Simulate New Version
                      </Button>
                    </div>

                    {showVersionInput && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newVersion}
                          onChange={(e) => setNewVersion(e.target.value)}
                          placeholder="e.g., v1.2.0"
                          className="flex-1 px-3 py-1 text-sm border rounded-md bg-background"
                        />
                        <Button onClick={handleSetNewVersion} size="sm">
                          Set
                        </Button>
                      </div>
                    )}
                  </div>
                )}
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

export default function Projects() {
  return (
    <>
      <AuthLoading>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Projects</h1>
              <p className="text-muted-foreground mt-2">
                Manage your deployment projects
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </AuthLoading>

      <Unauthenticated>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Projects</h1>
            <p className="text-muted-foreground">
              Sign in to manage your deployment projects
            </p>
          </div>
          <SignInButton />
        </div>
      </Unauthenticated>

      <Authenticated>
        <ProjectsContent />
      </Authenticated>
    </>
  );
}
