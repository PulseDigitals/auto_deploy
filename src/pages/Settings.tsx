import { useAuth } from "@/hooks/use-auth.ts";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { User, Key, Bell, Shield, Link2, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function Settings() {
  const { user } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  
  const connections = useQuery(api.providerAuthHelpers.getUserConnections, {});
  const disconnectProvider = useMutation(api.providerAuthHelpers.disconnectProvider);
  const connectVercel = useAction(api.providerAuthPublic.connectVercel);
  
  const vercelConnection = connections?.find((c) => c.provider === "vercel");
  
  const handleConnectVercel = async () => {
    try {
      setIsConnecting(true);
      const result = await connectVercel({});
      
      // Redirect to Vercel OAuth page
      window.location.href = result.authUrl;
    } catch (error) {
      toast.error("Failed to initiate connection");
      console.error(error);
      setIsConnecting(false);
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
