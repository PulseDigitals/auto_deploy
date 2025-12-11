import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { useAuth } from "@/hooks/use-auth.ts";

export default function Topbar() {
  const { user, signoutRedirect } = useAuth();

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-6">
      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex flex-col items-end">
          <p className="text-sm font-medium">{user?.profile.name || "User"}</p>
          <p className="text-xs text-slate-400">
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
