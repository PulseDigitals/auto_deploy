import { api } from "@/convex/_generated/api.js";
import type { ConvexReactClient } from "convex/react";

type ClerkState = {
  isSignedIn: boolean;
  userId: string | null;
};

type ConfirmationReport = {
  timestamp: string;
  clerk: ClerkState;
  checks: Record<string, unknown>;
  status: "PASS" | "FAIL" | "UNKNOWN";
};

export async function runAuthConfirmation(
  client: ConvexReactClient,
  clerkState: ClerkState
): Promise<ConfirmationReport> {
  const report: ConfirmationReport = {
    timestamp: new Date().toISOString(),
    clerk: clerkState,
    checks: {},
    status: "UNKNOWN",
  };

  if (!clerkState.isSignedIn || !clerkState.userId) {
    report.status = "FAIL";
    report.checks.clerk = {
      status: "FAIL",
      reason: "NOT_SIGNED_IN",
    };
    return report;
  }

  report.checks.clerk = { status: "PASS" };

  const authCheck = await client.query(api.authConfirmation.confirmAuth, {});
  report.checks.convexIdentity = authCheck;

  if (authCheck.status !== "PASS") {
    report.status = "FAIL";
    return report;
  }

  const userCheck = await client.query(api.userConfirmation.confirmUserRecord, {});
  report.checks.userRecord = userCheck;

  if (userCheck.status !== "PASS") {
    report.status = "FAIL";
    return report;
  }

  report.status = "PASS";
  return report;
}
