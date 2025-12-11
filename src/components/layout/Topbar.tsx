import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { useAuth } from "@/hooks/use-auth.ts";

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user, signoutRedirect } = useAuth();

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 hover:bg-muted rounded-md"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1 lg:ml-0" />

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex flex-col items-end">
          <p className="text-sm font-medium">{user?.profile.name || "User"}</p>
          <p className="text-xs text-muted-foreground">
            {user?.profile.email || "user@example.com"}
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => signoutRedirect()}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
