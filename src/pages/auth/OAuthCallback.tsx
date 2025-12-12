import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const handleCallback = useAction(api.providerAuthPublic.handleOAuthCallback);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get("code");
      const provider = searchParams.get("state"); // We can use state to identify provider

      // For now, assume Vercel
      const actualProvider = "vercel";

      if (!code) {
        setStatus("error");
        setError("No authorization code received");
        toast.error("Authorization failed");
        setTimeout(() => navigate("/dashboard/settings"), 3000);
        return;
      }

      try {
        const result = await handleCallback({ code, provider: actualProvider });
        
        if (result.success) {
          setStatus("success");
          toast.success(`Successfully connected to ${actualProvider}!`);
          setTimeout(() => navigate("/dashboard/settings"), 2000);
        } else {
          throw new Error("Connection failed");
        }
      } catch (err) {
        console.error("OAuth callback error:", err);
        setStatus("error");
        setError(err instanceof Error ? err.message : "Failed to connect provider");
        toast.error("Failed to connect provider");
        setTimeout(() => navigate("/dashboard/settings"), 3000);
      }
    };

    processCallback();
  }, [searchParams, handleCallback, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-500" />
              <h2 className="text-2xl font-semibold">Connecting Provider</h2>
              <p className="text-muted-foreground">
                Please wait while we complete the authorization...
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
              <h2 className="text-2xl font-semibold">Connection Successful!</h2>
              <p className="text-muted-foreground">
                Your provider account has been connected. Redirecting to settings...
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <AlertCircle className="h-12 w-12 mx-auto text-red-500" />
              <h2 className="text-2xl font-semibold">Connection Failed</h2>
              <p className="text-muted-foreground">{error || "An error occurred"}</p>
              <p className="text-sm text-muted-foreground">Redirecting to settings...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
