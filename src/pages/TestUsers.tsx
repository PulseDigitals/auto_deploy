import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Shield, FlaskConical, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

interface User {
  _id: Id<"users">;
  name?: string;
  email?: string;
  isAdmin: boolean;
  isTestUser: boolean;
  subscription?: {
    plan: string;
    activatedAt: number;
  };
  _creationTime: number;
}

export default function TestUsers() {
  const users = useQuery(api.users.listAllUsers, {});
  const isAdmin = useQuery(api.users.isCurrentUserAdmin, {});
  const toggleTestUser = useMutation(api.users.toggleTestUserStatus);

  const handleToggleTestUser = async (userId: Id<"users">, currentStatus: boolean) => {
    try {
      await toggleTestUser({ userId });
      toast.success(
        currentStatus
          ? "Test user access removed"
          : "Test user access granted"
      );
    } catch (error) {
      toast.error("Failed to update test user status");
      console.error(error);
    }
  };

  if (isAdmin === undefined || users === undefined) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Test Users</h1>
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <Shield className="h-16 w-16 text-muted-foreground" />
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Admin Access Required</h1>
          <p className="text-muted-foreground">
            You need admin privileges to manage test users
          </p>
        </div>
      </div>
    );
  }

  const testUsers = users.filter((u: User) => u.isTestUser);
  const regularUsers = users.filter((u: User) => !u.isTestUser);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FlaskConical className="h-8 w-8 text-purple-500" />
          Test Users Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Grant special testing privileges to users for development and QA purposes
        </p>
      </div>

      {/* Info Card */}
      <Card className="border-purple-500/50 bg-purple-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-purple-500" />
            Test User Benefits
          </CardTitle>
          <CardDescription>
            Test users receive the following overrides:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Unlimited Deployments</p>
                <p className="text-sm text-muted-foreground">No deployment limits or quotas</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Beta Feature Access</p>
                <p className="text-sm text-muted-foreground">Early access to all beta features</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Bypass Cost Limits</p>
                <p className="text-sm text-muted-foreground">No cost guardrails or warnings</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Free Premium Features</p>
                <p className="text-sm text-muted-foreground">Access all paid plan features</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Test Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-500">{testUsers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Regular Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">{regularUsers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Toggle test user status for any user. Test users will see a badge in their dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user: User) => (
                <div
                  key={user._id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    user.isTestUser
                      ? "bg-purple-500/5 border-purple-500/30"
                      : "bg-muted/30 border-border"
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {user.name || "No Name"}
                        </p>
                        {user.isAdmin && (
                          <Badge variant="outline" className="border-amber-500 text-amber-500">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                        {user.isTestUser && (
                          <Badge variant="outline" className="border-purple-500 text-purple-500">
                            <FlaskConical className="h-3 w-3 mr-1" />
                            Test User
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span>{user.email || "No email"}</span>
                        <span>•</span>
                        <span className="capitalize">
                          {user.subscription?.plan || "free"} plan
                        </span>
                        <span>•</span>
                        <span>
                          Joined {new Date(user._creationTime).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={user.isTestUser}
                        onCheckedChange={() => handleToggleTestUser(user._id, user.isTestUser)}
                        className="data-[state=checked]:bg-purple-600"
                      />
                      <span className="text-sm text-muted-foreground">
                        {user.isTestUser ? (
                          <CheckCircle2 className="h-4 w-4 text-purple-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
