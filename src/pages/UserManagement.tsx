import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { 
  Shield, 
  Users, 
  Activity, 
  DollarSign, 
  MapPin, 
  Rocket,
  FolderGit2,
  TrendingUp,
  Calendar,
  FlaskConical,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

interface UserWithStats {
  _id: Id<"users">;
  name?: string;
  email?: string;
  isAdmin: boolean;
  isTestUser: boolean;
  subscription?: {
    plan: string;
    activatedAt: number;
  };
  location?: {
    country?: string;
    city?: string;
    timezone?: string;
  };
  billingInfo?: {
    totalSpent: number;
    lastPaymentAt?: number;
    lastPaymentAmount?: number;
    paymentMethod?: string;
  };
  lastActiveAt: number;
  isActive: boolean;
  daysSinceActive: number;
  totalProjects: number;
  totalDeployments: number;
  successfulDeployments: number;
  _creationTime: number;
}

export default function UserManagement() {
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  
  const users = useQuery(api.userManagement.getAllUsersWithStats, {});
  const isAdmin = useQuery(api.users.isCurrentUserAdmin, {});
  const userStats = useQuery(
    api.userManagement.getUserStatistics,
    selectedUserId ? { userId: selectedUserId } : "skip"
  );

  if (isAdmin === undefined || users === undefined) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
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
            You need admin privileges to access user management
          </p>
        </div>
      </div>
    );
  }

  // Filter users
  const filteredUsers = users.filter((user: UserWithStats) => {
    if (filterStatus === "active") return user.isActive;
    if (filterStatus === "inactive") return !user.isActive;
    return true;
  });

  // Calculate overview stats
  const totalUsers = users.length;
  const activeUsers = users.filter((u: UserWithStats) => u.isActive).length;
  const totalRevenue = users.reduce((sum: number, u: UserWithStats) => 
    sum + (u.billingInfo?.totalSpent || 0), 0
  );
  const totalDeployments = users.reduce((sum: number, u: UserWithStats) => 
    sum + u.totalDeployments, 0
  );

  const getActivityColor = (daysSinceActive: number) => {
    if (daysSinceActive === 0) return "text-green-500";
    if (daysSinceActive <= 3) return "text-green-400";
    if (daysSinceActive <= 7) return "text-yellow-500";
    if (daysSinceActive <= 30) return "text-orange-500";
    return "text-red-500";
  };

  const getActivityStatus = (daysSinceActive: number) => {
    if (daysSinceActive === 0) return "Active Today";
    if (daysSinceActive === 1) return "Active Yesterday";
    if (daysSinceActive <= 7) return `${daysSinceActive}d ago`;
    if (daysSinceActive <= 30) return `${daysSinceActive}d inactive`;
    return `${Math.floor(daysSinceActive / 30)}mo inactive`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Users className="h-8 w-8 text-blue-500" />
          User Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive overview of all users, their activity, and billing information
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeUsers} active ({Math.round((activeUsers / totalUsers) * 100)}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{activeUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-500">
              ${totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Rocket className="h-4 w-4" />
              Total Deployments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">{totalDeployments}</div>
            <p className="text-xs text-muted-foreground mt-1">Platform-wide</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filterStatus === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatus("all")}
        >
          All Users ({users.length})
        </Button>
        <Button
          variant={filterStatus === "active" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatus("active")}
        >
          <Activity className="h-4 w-4 mr-2" />
          Active ({activeUsers})
        </Button>
        <Button
          variant={filterStatus === "inactive" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatus("inactive")}
        >
          <Clock className="h-4 w-4 mr-2" />
          Inactive ({totalUsers - activeUsers})
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
          <CardDescription>
            Click on any user to view detailed statistics and activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            ) : (
              filteredUsers.map((user: UserWithStats) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedUserId(user._id)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">
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
                            Test
                          </Badge>
                        )}
                        <Badge variant="outline" className="capitalize">
                          {user.subscription?.plan || "free"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="truncate">{user.email || "No email"}</span>
                        {user.location?.country && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {user.location.city}, {user.location.country}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="hidden md:flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Projects</div>
                        <div className="text-lg font-semibold">{user.totalProjects}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Deployments</div>
                        <div className="text-lg font-semibold">{user.totalDeployments}</div>
                      </div>
                      {user.billingInfo && (
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Revenue</div>
                          <div className="text-lg font-semibold text-emerald-500">
                            ${user.billingInfo.totalSpent}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Activity Status */}
                    <div className="flex items-center gap-2">
                      {user.isActive ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className={`text-sm font-medium ${getActivityColor(user.daysSinceActive)}`}>
                        {getActivityStatus(user.daysSinceActive)}
                      </span>
                    </div>

                    <Button size="sm" variant="ghost">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Detail Modal */}
      <Dialog open={!!selectedUserId} onOpenChange={() => setSelectedUserId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              User Profile & Statistics
            </DialogTitle>
            <DialogDescription>
              Comprehensive overview of user activity and performance
            </DialogDescription>
          </DialogHeader>

          {userStats ? (
            <div className="space-y-6">
              {/* User Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{userStats.user.name || "No Name"}</h3>
                  <p className="text-muted-foreground">{userStats.user.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {userStats.user.isAdmin && (
                      <Badge variant="outline" className="border-amber-500 text-amber-500">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                      </Badge>
                    )}
                    {userStats.user.isTestUser && (
                      <Badge variant="outline" className="border-purple-500 text-purple-500">
                        <FlaskConical className="h-3 w-3 mr-1" />
                        Test User
                      </Badge>
                    )}
                    <Badge variant="outline" className="capitalize">
                      {userStats.user.subscription?.plan || "free"} Plan
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Member Since</div>
                  <div className="font-medium">
                    {new Date(userStats.user._creationTime).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Projects
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{userStats.statistics.totalProjects}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Deployments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{userStats.statistics.totalDeployments}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {userStats.statistics.successRate}% success rate
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Activity Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">
                      {userStats.statistics.inactivityStatus}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Deployment Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Deployment Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-500">
                        {userStats.statistics.successfulDeployments}
                      </div>
                      <div className="text-xs text-muted-foreground">Successful</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-500">
                        {userStats.statistics.failedDeployments}
                      </div>
                      <div className="text-xs text-muted-foreground">Failed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-500">
                        {userStats.statistics.runningDeployments}
                      </div>
                      <div className="text-xs text-muted-foreground">Running</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {userStats.statistics.successRate}%
                      </div>
                      <div className="text-xs text-muted-foreground">Success Rate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Provider Breakdown */}
              {Object.keys(userStats.statistics.providerBreakdown).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Provider Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(Object.entries(userStats.statistics.providerBreakdown) as [string, number][]).map(([provider, count]) => (
                        <div key={provider} className="flex items-center justify-between">
                          <span className="font-medium">{provider}</span>
                          <Badge variant="secondary">{count} deployments</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Location & Billing */}
              <div className="grid gap-4 md:grid-cols-2">
                {userStats.user.location && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Location
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {userStats.user.location.city && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">City</span>
                          <span className="font-medium">{userStats.user.location.city}</span>
                        </div>
                      )}
                      {userStats.user.location.country && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Country</span>
                          <span className="font-medium">{userStats.user.location.country}</span>
                        </div>
                      )}
                      {userStats.user.location.timezone && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Timezone</span>
                          <span className="font-medium">{userStats.user.location.timezone}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {userStats.user.billingInfo && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Billing
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Spent</span>
                        <span className="font-medium text-emerald-500">
                          ${userStats.user.billingInfo.totalSpent}
                        </span>
                      </div>
                      {userStats.user.billingInfo.lastPaymentAmount && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Payment</span>
                          <span className="font-medium">
                            ${userStats.user.billingInfo.lastPaymentAmount}
                          </span>
                        </div>
                      )}
                      {userStats.user.billingInfo.paymentMethod && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Payment Method</span>
                          <span className="font-medium capitalize">
                            {userStats.user.billingInfo.paymentMethod}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Recent Activity */}
              {userStats.recentDeployments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Deployments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {userStats.recentDeployments.map((deployment: {
                        _id: Id<"deployments">;
                        provider: string;
                        status: string;
                        createdAt: number;
                        projectId: Id<"projects">;
                      }) => (
                        <div
                          key={deployment._id}
                          className="flex items-center justify-between p-2 rounded border"
                        >
                          <div className="flex items-center gap-3">
                            <Rocket className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{deployment.provider}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">
                              {new Date(deployment.createdAt).toLocaleDateString()}
                            </span>
                            <Badge
                              variant={
                                deployment.status === "success"
                                  ? "default"
                                  : deployment.status === "failed"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {deployment.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
