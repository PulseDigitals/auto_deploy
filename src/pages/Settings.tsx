import { useAuth } from "@/hooks/use-auth.ts";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { User, Key, Bell, Shield, Link2, CheckCircle2, XCircle, Loader2, Rocket, RefreshCw, AlertCircle, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { getOAuthStartUrl } from "@/lib/convex-http.ts";

interface VercelTeam {
  id: string;
  slug: string;
  name: string;
}

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [newReleaseVersion, setNewReleaseVersion] = useState("");
  const [newReleaseNotes, setNewReleaseNotes] = useState("");
  const [newReleaseChannel, setNewReleaseChannel] = useState<"stable" | "beta">("stable");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [showDebugDetails, setShowDebugDetails] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<VercelTeam[]>([]);
  const [isFetchingTeams, setIsFetchingTeams] = useState(false);
  
  // Vercel connection queries
  const vercelConnection = useQuery(api.vercelConnections.getVercelConnection, {});
  
  // Other queries
  const connections = useQuery(api.providerAuthHelpers.getUserConnections, {});
  const isAdmin = useQuery(api.users.isCurrentUserAdmin, {});
  const releaseStatus = useQuery(api.platformReleases.getReleaseAutomationStatus, {});
  
  // Actions
  const fetchVercelTeams = useAction(api.vercel.fetchTeams.getAvailableTeams);
  
  // Mutations
  const generateOAuthState = useMutation(api.oauth.vercel.generateOAuthState);
  const setInstalledTeam = useMutation(api.vercelConnections.setInstalledTeam);
  const disconnectVercel = useMutation(api.vercelConnections.disconnectVercel);
  const disconnectProvider = useMutation(api.providerAuthHelpers.disconnectProvider);
  const setAutomationSettings = useMutation(api.platformReleases.setReleaseAutomationSettings);
  const simulateRelease = useMutation(api.platformReleases.simulateNewRelease);
  const checkForReleases = useMutation(api.platformReleases.checkForReleases);
  
  const vercelConnectionOld = connections?.find((c) => c.provider === "vercel");
  
  // Fetch teams when connection is established
  useEffect(() => {
    const loadTeams = async () => {
      if (vercelConnection?.hasToken) {
        setIsFetchingTeams(true);
        try {
          const teams = await fetchVercelTeams({});
          setAvailableTeams(teams);
        } catch (error) {
          console.error("Failed to fetch teams:", error);
          setAvailableTeams([]);
        } finally {
          setIsFetchingTeams(false);
        }
      } else {
        setAvailableTeams([]);
      }
    };
    
    loadTeams();
  }, [vercelConnection?.hasToken, fetchVercelTeams]);
  
  // Handle OAuth callback success/error messages
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    const message = searchParams.get("message");
    
    if (connected === "vercel") {
      toast.success("Successfully connected to Vercel!");
      // Clear URL parameters
      setSearchParams({});
    }
    
    if (error) {
      const errorMessages: Record<string, string> = {
        missing_code: "Authorization code missing. Please try connecting again.",
        missing_state: "Security check failed: Missing state parameter. Please try connecting again.",
        invalid_state: "Security check failed (state mismatch or expired). Please click Connect again.",
        token_exchange_failed: "Connection failed while exchanging the authorization code. Please re-try. If it persists, confirm your Vercel App Client Secret and Redirect URI match exactly.",
        no_access_token: "No access token received from Vercel. Please try connecting again.",
        oauth_error: message ? decodeURIComponent(message) : "Vercel OAuth error occurred",
        config_missing: "OAuth configuration is incomplete. Please check your environment variables.",
        unknown: "An unknown error occurred. Please try again.",
      };
      toast.error(errorMessages[error] || "Failed to connect to Vercel");
      // Clear URL parameters
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);
  
  const handleConnectVercel = async () => {
    setIsConnecting(true);
    try {
      // Step 1: Generate state token with user context
      const { state } = await generateOAuthState({});
      
      // Step 2: Build OAuth start URL with state
      const baseUrl = getOAuthStartUrl("vercel");
      const oauthUrl = `${baseUrl}?state=${encodeURIComponent(state)}`;
      
      console.log("Redirecting to Vercel OAuth:", oauthUrl);
      
      // Step 3: Redirect to OAuth flow
      window.location.href = oauthUrl;
    } catch (error) {
      console.error("Failed to start OAuth flow:", error);
      toast.error("Failed to start OAuth flow. Please try again.");
      setIsConnecting(false);
    }
  };
  
  const handleDisconnectVercel = async () => {
    try {
      await disconnectVercel({});
      toast.success("Disconnected from Vercel");
    } catch (error) {
      toast.error("Failed to disconnect");
      console.error(error);
    }
  };

  const handleInstallTeam = async () => {
    if (!selectedTeamId) {
      toast.error("Please select a team");
      return;
    }

    const team = availableTeams?.find((t) => t.id === selectedTeamId);
    if (!team) {
      toast.error("Selected team not found");
      return;
    }

    try {
      const result = await setInstalledTeam({
        teamId: team.id,
        teamSlug: team.slug,
      });
      toast.success(`Installed successfully. Auto Deploy can now deploy projects in ${result.teamSlug}.`);
      setSelectedTeamId("");
    } catch (error) {
      toast.error("Failed to install team");
      console.error(error);
    }
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

      {/* Vercel Connection & Team Installation */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Vercel Connection</h2>
        <p className="text-muted-foreground mb-6">
          Connect your Vercel account and select a team for live deployments
        </p>
        
        <div className="grid gap-6">
          {/* Main Connection Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Connection Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-black flex items-center justify-center">
                      <span className="text-white font-bold text-sm">▲</span>
                    </div>
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        Vercel
                        {vercelConnection ? (
                          <Badge variant="default" className="bg-green-500/20 text-green-300 border-green-500/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Connected
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-slate-500/20 text-slate-300 border-slate-500/30">
                            <XCircle className="h-3 w-3 mr-1" />
                            Not Connected
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {vercelConnection 
                          ? "Connected and ready for live deployments" 
                          : "Connect to deploy projects to Vercel"}
                      </p>
                    </div>
                  </div>
                  <div>
                    {vercelConnection ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleDisconnectVercel}
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

                {/* Team Installation (only shown when connected) */}
                {vercelConnection && (
                  <>
                    <div className="border-t border-border pt-4">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-base font-semibold">Install into a Team</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Select the Vercel team where this app can create deployments and manage projects. You can change this later.
                          </p>
                        </div>

                        {vercelConnection.teamSlug ? (
                          <Alert>
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertTitle>Installed in Team</AlertTitle>
                            <AlertDescription>
                              Auto Deploy is currently installed in <strong>{vercelConnection.teamSlug}</strong>. 
                              Projects will be deployed to this team by default.
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>No Team Selected</AlertTitle>
                            <AlertDescription>
                              Please select a team below to enable live deployments.
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="team-select">
                            Choose where to install Auto Deploy
                          </Label>
                          <div className="flex gap-2">
                            <Select value={selectedTeamId} onValueChange={setSelectedTeamId} disabled={isFetchingTeams}>
                              <SelectTrigger id="team-select" className="flex-1">
                                <SelectValue placeholder={isFetchingTeams ? "Loading teams..." : "Select a team..."} />
                              </SelectTrigger>
                              <SelectContent>
                                {isFetchingTeams ? (
                                  <SelectItem value="loading" disabled>
                                    <div className="flex items-center gap-2">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      Loading teams...
                                    </div>
                                  </SelectItem>
                                ) : availableTeams && availableTeams.length > 0 ? (
                                  availableTeams.map((team) => (
                                    <SelectItem key={team.id} value={team.id}>
                                      {team.name} ({team.slug})
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="none" disabled>
                                    No teams available
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={handleInstallTeam}
                              disabled={!selectedTeamId || isFetchingTeams}
                            >
                              Install to Team
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            If you belong to multiple teams, choose the one that owns the projects you want to deploy.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Debug Details (Expandable) */}
          <Card>
            <CardContent className="pt-6">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between"
                onClick={() => setShowDebugDetails(!showDebugDetails)}
              >
                <span className="font-medium">Debug Details</span>
                {showDebugDetails ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              {showDebugDetails && (
                <div className="mt-4 space-y-3 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Connection Status</Label>
                    <p className="mt-1">
                      {vercelConnection ? "Connected" : "Not Connected"}
                    </p>
                  </div>

                  {vercelConnection && (
                    <>
                      <div>
                        <Label className="text-xs text-muted-foreground">Installed Team</Label>
                        <p className="mt-1">
                          {vercelConnection.teamSlug || "No team selected"}
                        </p>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Token Status</Label>
                        <p className="mt-1">
                          {vercelConnection.hasToken ? "Valid" : "Missing"}
                        </p>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Connected At</Label>
                        <p className="mt-1">
                          {new Date(vercelConnection.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </>
                  )}

                  <div>
                    <Label className="text-xs text-muted-foreground">OAuth Start URL</Label>
                    <p className="mt-1 font-mono text-xs break-all">
                      {getOAuthStartUrl("vercel")}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Make sure your VERCEL_REDIRECT_URI environment variable and Vercel OAuth app settings both use:
                      <br />
                      <code className="text-xs">https://pleasant-donkey-394.convex.site/auth/vercel/callback</code>
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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
    </div>
  );
}
