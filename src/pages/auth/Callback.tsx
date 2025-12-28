import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner.tsx";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect users back to the app; server-side auth handles tokens
    navigate("/dashboard", { replace: true });
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-svh gap-4">
      <Spinner className="size-8" />
      <p className="text-sm text-muted-foreground">Redirecting...</p>
    </div>
  );
}
