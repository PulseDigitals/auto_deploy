export type SubscriptionPlan = "free" | "pro" | "team" | "enterprise";
export type Feature = "email_alerts" | "slack_alerts" | "custom_thresholds" | "live_deployment";

export function hasAccess(plan: SubscriptionPlan, feature: Feature): boolean {
  if (feature === "email_alerts") return plan !== "free";
  if (feature === "slack_alerts") return plan === "team" || plan === "enterprise";
  if (feature === "custom_thresholds") return plan === "enterprise";
  if (feature === "live_deployment") return plan !== "free"; // Pro+ only
  return false;
}

export function getRequiredPlan(feature: Feature): string {
  if (feature === "email_alerts") return "Pro";
  if (feature === "slack_alerts") return "Team";
  if (feature === "custom_thresholds") return "Enterprise";
  if (feature === "live_deployment") return "Pro";
  return "Free";
}

export function getPlanDisplayName(plan: SubscriptionPlan): string {
  const names = { free: "Free", pro: "Pro", team: "Team", enterprise: "Enterprise" };
  return names[plan] || "Unknown";
}
