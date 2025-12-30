import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useConvex } from "convex/react";
import { runAuthConfirmation } from "@/auth/runAuthConfirmation.ts";
import { Button } from "./ui/button.tsx";
import { Card } from "./ui/card.tsx";

export function AuthConfirmationPanel() {
  const { isSignedIn, userId } = useAuth();
  const convex = useConvex();
  const [report, setReport] = useState<unknown>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    try {
      const result = await runAuthConfirmation(convex, {
        isSignedIn: Boolean(isSignedIn),
        userId: userId ?? null,
      });
      setReport(result);
    } finally {
      setRunning(false);
    }
  };

  const reportJson = report ? JSON.stringify(report, null, 2) : null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold">Auth Confirmation</div>
        <Button size="sm" onClick={run} disabled={running}>
          {running ? "Running..." : "Run"}
        </Button>
      </div>
      <div className="text-sm text-muted-foreground">
        Validates Clerk session, Convex identity, and user record (no secrets logged).
      </div>
      {reportJson && (
        <pre className="text-xs bg-muted rounded p-3 overflow-x-auto">
          {reportJson}
        </pre>
      )}
    </Card>
  );
}
