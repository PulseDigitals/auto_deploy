import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { CheckCircle2, AlertTriangle, Clock, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface RenderAuthSetupProps {
  projectId: Id<"projects">;
}

export default function RenderAuthSetup({ projectId }: RenderAuthSetupProps) {
  const [isVerifying, setIsVerifying] = useState(false);

  const authStatus = useQuery(api.projects.getRenderAuthStatus, { projectId });
  const verifyAuth = useMutation(api.projects.verifyRenderAuth);

  if (!authStatus || authStatus.status === "unknown") {
    return null;
  }

  // Show nothing if no redirect URI yet (no Render service created)
  if (!authStatus.redirectUri) {
    return null;
  }

  const handleCopyRedirectUri = () => {
    if (authStatus.redirectUri) {
      navigator.clipboard.writeText(authStatus.redirectUri);
      toast.success("Redirect URI copied to clipboard!");
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const result = await verifyAuth({ projectId });
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusBadge = () => {
    switch (authStatus.status) {
      case "verified":
        return (
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        );
      case "needs_setup":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Needs Setup
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Unknown
          </Badge>
        );
    }
  };

  return (
    <Card className="border-orange-500/30 bg-orange-500/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Render Auth Setup
              {getStatusBadge()}
            </CardTitle>
            <CardDescription>
              {authStatus.status === "verified"
                ? "Authentication is configured. Sign-in will work on your Render deployment."
                : "One-time setup required for Hercules Auth to work on Render."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Service URL */}
        {authStatus.serviceUrl && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Render Service URL</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 rounded-md bg-muted text-sm font-mono">
                {authStatus.serviceUrl}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(authStatus.serviceUrl, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Redirect URI */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Redirect URI to Register
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-md bg-muted text-sm font-mono break-all">
              {authStatus.redirectUri}
            </code>
            <Button size="sm" variant="outline" onClick={handleCopyRedirectUri}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Setup Instructions (shown if not verified) */}
        {authStatus.status !== "verified" && (
          <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30 space-y-3">
            <div className="font-medium text-orange-200 text-sm">How to Register This URI:</div>
            <ol className="text-sm text-orange-200/80 space-y-2 list-decimal list-inside">
              <li>
                Copy the redirect URI above <Copy className="h-3 w-3 inline" />
              </li>
              <li>Go to Hercules dashboard → More → Auth Settings</li>
              <li>Find "Redirect URIs" section</li>
              <li>Add the copied redirect URI and click Save</li>
              <li>Return here and click "Verify" below</li>
            </ol>
          </div>
        )}

        {/* Verify Button */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-muted-foreground">
            {authStatus.lastCheckedAt &&
              `Last checked: ${new Date(authStatus.lastCheckedAt).toLocaleString()}`}
          </div>
          <Button
            onClick={handleVerify}
            disabled={isVerifying}
            variant={authStatus.status === "verified" ? "outline" : "default"}
            size="sm"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                {authStatus.status === "verified" ? "Re-verify" : "Verify"}
              </>
            )}
          </Button>
        </div>

        {/* Success Message */}
        {authStatus.status === "verified" && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="text-sm text-green-200 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium">Setup Complete!</div>
                <div className="text-green-200/80 text-xs mt-1">
                  All future deployments will work automatically. No need to register the redirect
                  URI again.
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
