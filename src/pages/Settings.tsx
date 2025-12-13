import { useAuth } from "@/hooks/use-auth.ts";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { User, Key, Bell, Shield, Link2, CheckCircle2, XCircle, Loader2, Rocket, RefreshCw, AlertCircle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { getOAuthStartUrl } from "@/lib/convex-http.ts";

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [newReleaseVersion, setNewReleaseVersion] = useState("");
  const [newReleaseNotes, setNewReleaseNotes] = useState("");
  const [newReleaseChannel, setNewReleaseChannel] = useState<"stable" | "beta">("stable");
  
  const connections = useQuery(api.providerAuthHelpers.getUserConnections, {});
  const isAdmin = useQuery(api.users.isCurrentUserAdmin, {});
  const releaseStatus = useQuery(api.platformReleases.getReleaseAutomationStatus, {});
  
  const disconnectProvider = useMutation(api.providerAuthHelpers.disconnectProvider);
  const setAutomationSettings = useMutation(api.platformReleases.setReleaseAutomationSettings);
  const simulateRelease = useMutation(api.platformReleases.simulateNewRelease);
  const checkForReleases = useMutation(api.platformReleases.checkForReleases);
  
  const vercelConnection = connections?.find((c) => c.provider === "vercel");
  
  // Handle OAuth callback success/error messages
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    
    if (connected === "vercel") {
      toast.success("Successfully connected to Vercel!");
      // Clear URL parameters
      setSearchParams({});
    }
    
    if (error) {
      const errorMessages: Record<string, string> = {
        missing_code: "Authorization code missing",
        config_missing: "OAuth configuration not set up",
        token_exchange_failed: "Failed to exchange authorization code",
        no_access_token: "No access token received",
        user_fetch_failed: "Failed to fetch user information",
        unknown: "An unknown error occurred",
      };
      toast.error(errorMessages[error] || "Failed to connect provider");
      // Clear URL parameters
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);
  
  const handleConnectVercel = () => {
    // CRITICAL: OAuth must be initiated via full HTTP redirect to Convex HTTP Actions
    // HTTP Actions are deployed on Convex domain (e.g., https://<deployment>.convex.site)
    // NOT on the Vite app domain
    setIsConnecting(true);
    const oauthUrl = getOAuthStartUrl("vercel");
    console.log("Redirecting to Vercel OAuth:", oauthUrl);
    window.location.href = oauthUrl;
  };
  
  const handleDisconnect = async (provider: string) => {
    try {
      await disconnectProvider({ provider });
      toast.success(`Disconnected from ${provider}`);
    } catch (error) {
      toast.error("Failed to disconnect");
      console.error(error);
    }
  };

  const handleToggleAutoDeploy = async () => {
    if (!releaseStatus) return;
    try {
      await setAutomationSettings({
        autoDeployOnRelease: !releaseStatus.autoDeployOnRelease,
        releaseChannel: releaseStatus.releaseChannel,
        releaseSource: releaseStatus.releaseSource,
      });
      toast.success(`Auto-deploy ${!releaseStatus.autoDeployOnRelease ? "enabled" : "disabled"}`);
    } catch (error) {
      toast.error("Failed to update settings");
    }
  };

  const handleReleaseChannelChange = async (channel: "stable" | "beta") => {
    if (!releaseStatus) return;
    try {
      await setAutomationSettings({
        autoDeployOnRelease: releaseStatus.autoDeployOnRelease,
        releaseChannel: channel,
        releaseSource: releaseStatus.releaseSource,
      });
      toast.success(`Release channel set to ${channel}`);
    } catch (error) {
      toast.error("Failed to update settings");
    }
  };

  const handleReleaseSourceChange = async (source: "manual" | "github") => {
    if (!releaseStatus) return;
    try {
      await setAutomationSettings({
        autoDeployOnRelease: releaseStatus.autoDeployOnRelease,
        releaseChannel: releaseStatus.releaseChannel,
        releaseSource: source,
      });
      toast.success(`Release source set to ${source}`);
    } catch (error) {
      toast.error("Failed to update settings");
    }
  };

  const handleCheckForReleases = async () => {
    try {
      const result = await checkForReleases({});
      toast.success(result.message);
    } catch (error) {
      toast.error("Failed to check for releases");
    }
  };

  const handleSimulateRelease = async () => {
    if (!newReleaseVersion) {
      toast.error("Please enter a version");
      return;
    }
    try {
      const result = await simulateRelease({
        version: newReleaseVersion,
        notes: newReleaseNotes || undefined,
        channel: newReleaseChannel,
      });
      
      if (result.status === "queued") {
        toast.success("Release detected and queued for deployment");
      } else {
        toast.success("Release detected (deployment not started)");
      }
      
      setNewReleaseVersion("");
      setNewReleaseNotes("");
      setNewReleaseChannel("stable");
    } catch (error) {
      toast.error("Failed to simulate release");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account and preferences
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <p className="text-sm text-muted-foreground mt-1">
                {user?.profile.name || "Not set"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <p className="text-sm text-muted-foreground mt-1">
                {user?.profile.email || "Not set"}
              </p>
            </div>
            <Button variant="outline" disabled>
              Edit Profile
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Manage API keys for programmatic access to AI Deploy Agent
            </p>
            <Button variant="outline" disabled>
              Generate API Key
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure deployment notifications and alerts
            </p>
            <Button variant="outline" disabled>
              Manage Notifications
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Security settings and access control
            </p>
            <Button variant="outline" disabled>
              Security Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Release Automation (Admin Only) */}
      {isAdmin && releaseStatus && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Release Automation</h2>
          <p className="text-muted-foreground mb-6">
            Configure automatic deployment when new platform releases are detected
          </p>

          {/* Alert Callouts */}
          {releaseStatus.updateAvailable && (
            <Card className="mb-6 border-amber-500/50 bg-amber-950/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-500">Update available</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {releaseStatus.currentVersion} → {releaseStatus.latestAvailableVersion}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {releaseStatus.autoDeployOnRelease && releaseStatus.updateAvailable && (
            <Card className="mb-6 border-green-500/50 bg-green-950/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-500">Auto-deploy enabled</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Next release will deploy automatically
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6">
            {/* Automation Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Automation Settings</CardTitle>
                <CardDescription>Configure how releases are detected and deployed</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Auto-deploy toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-deploy on new release</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically deploy when a new release is detected
                    </p>
                  </div>
                  <Button
                    variant={releaseStatus.autoDeployOnRelease ? "default" : "outline"}
                    size="sm"
                    onClick={handleToggleAutoDeploy}
                  >
                    {releaseStatus.autoDeployOnRelease ? "ON" : "OFF"}
                  </Button>
                </div>

                {/* Release Channel */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Release Channel</Label>
                    <p className="text-sm text-muted-foreground">
                      Which release channel to track
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={releaseStatus.releaseChannel === "stable" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleReleaseChannelChange("stable")}
                    >
                      Stable
                    </Button>
                    <Button
                      variant={releaseStatus.releaseChannel === "beta" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleReleaseChannelChange("beta")}
                    >
                      Beta
                    </Button>
                  </div>
                </div>

                {/* Release Source */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Release Source</Label>
                    <p className="text-sm text-muted-foreground">
                      How releases are detected
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={releaseStatus.releaseSource === "manual" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleReleaseSourceChange("manual")}
                    >
                      Manual
                    </Button>
                    <Button
                      variant={releaseStatus.releaseSource === "github" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleReleaseSourceChange("github")}
                    >
                      GitHub
                      <span className="ml-1 text-xs opacity-60">(stub)</span>
                    </Button>
                  </div>
                </div>

                {/* Check for updates button */}
                <Button
                  variant="outline"
                  onClick={handleCheckForReleases}
                  className="w-full gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Check for Updates
                </Button>

                {releaseStatus.lastReleaseCheckAt && (
                  <p className="text-xs text-muted-foreground">
                    Last checked: {new Date(releaseStatus.lastReleaseCheckAt).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Simulate Release */}
            <Card>
              <CardHeader>
                <CardTitle>Simulate New Release</CardTitle>
                <CardDescription>Manually simulate a new platform release for testing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    placeholder="v1.2.0"
                    value={newReleaseVersion}
                    onChange={(e) => setNewReleaseVersion(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Release Notes (Optional)</Label>
                  <textarea
                    id="notes"
                    placeholder="What's new in this release..."
                    value={newReleaseNotes}
                    onChange={(e) => setNewReleaseNotes(e.target.value)}
                    className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md bg-background resize-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Label>Channel:</Label>
                  <Button
                    variant={newReleaseChannel === "stable" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewReleaseChannel("stable")}
                  >
                    Stable
                  </Button>
                  <Button
                    variant={newReleaseChannel === "beta" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewReleaseChannel("beta")}
                  >
                    Beta
                  </Button>
                </div>

                <Button onClick={handleSimulateRelease} className="w-full gap-2">
                  <Rocket className="h-4 w-4" />
                  Simulate Release
                </Button>
              </CardContent>
            </Card>

            {/* Release History */}
            <Card>
              <CardHeader>
                <CardTitle>Release History</CardTitle>
                <CardDescription>Recent platform releases and their deployment status</CardDescription>
              </CardHeader>
              <CardContent>
                {releaseStatus.recentReleases && releaseStatus.recentReleases.length > 0 ? (
                  <div className="space-y-2">
                    {releaseStatus.recentReleases.map((release) => (
                      <div
                        key={release._id}
                        className="flex items-center justify-between p-3 bg-slate-900 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">{release.version}</span>
                            <Badge
                              variant={release.channel === "stable" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {release.channel}
                            </Badge>
                            <Badge
                              variant={
                                release.status === "deployed"
                                  ? "default"
                                  : release.status === "failed"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {release.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(release.detectedAt).toLocaleString()}
                          </p>
                          {release.notes && (
                            <p className="text-sm text-muted-foreground mt-1 truncate">
                              {release.notes}
                            </p>
                          )}
                        </div>
                        {release.deploymentId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/dashboard`)}
                            className="gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No releases yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Provider Connections */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Provider Connections</h2>
        <p className="text-muted-foreground mb-6">
          Connect your deployment provider accounts to enable live deployments
        </p>
        
        <div className="grid gap-4">
          {/* Vercel */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-black flex items-center justify-center">
                    <span className="text-white font-bold text-sm">▲</span>
                  </div>
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      Vercel
                      {vercelConnection ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-300">
                          <CheckCircle2 className="h-3 w-3" />
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-500/20 text-slate-300">
                          <XCircle className="h-3 w-3" />
                          Not Connected
                        </span>
                      )}
                    </div>
                    {vercelConnection ? (
                      <div className="text-sm text-muted-foreground mt-1">
                        <div>Account: {vercelConnection.accountName}</div>
                        {vercelConnection.teamName && (
                          <div>Team: {vercelConnection.teamName}</div>
                        )}
                        <div className="text-xs mt-1">
                          Scopes: {vercelConnection.scopes.join(", ")}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">
                        Connect to deploy to Vercel
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  {vercelConnection ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDisconnect("vercel")}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={handleConnectVercel}
                      disabled={isConnecting}
                      className="gap-2"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Link2 className="h-4 w-4" />
                          Connect Vercel
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Other providers (coming soon) */}
          <Card className="opacity-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">N</span>
                  </div>
                  <div>
                    <div className="font-semibold">Netlify</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Coming soon
                    </p>
                  </div>
                </div>
                <Button size="sm" disabled>
                  Connect
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
