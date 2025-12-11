import { useNavigate } from "react-router-dom";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";
import { FolderGit2, ExternalLink, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

interface ProjectListProps {
  projects: Doc<"projects">[] | undefined;
}

export default function ProjectList({ projects }: ProjectListProps) {
  const navigate = useNavigate();
  if (projects === undefined) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderGit2 />
          </EmptyMedia>
          <EmptyTitle>No projects yet</EmptyTitle>
          <EmptyDescription>
            Create your first project to start deploying with AI
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <Card
          key={project._id}
          onClick={() => navigate(`/dashboard/projects/${project._id}`)}
          className="cursor-pointer hover:bg-slate-800 hover:border-primary/50 transition-colors"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderGit2 className="h-5 w-5 text-muted-foreground" />
              <span className="truncate">{project.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {project.gitRepoUrl && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <GitBranch className="h-4 w-4" />
                <span className="truncate">{project.gitRepoUrl}</span>
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Created {new Date(project.createdAt).toLocaleDateString()}
            </div>
            <Button variant="outline" size="sm" className="w-full gap-2">
              <ExternalLink className="h-4 w-4" />
              View Details
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
