import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  requiredPlan: string;
}

export default function UpgradeModal({
  open,
  onOpenChange,
  feature,
  requiredPlan,
}: UpgradeModalProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate("/pricing");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <Lock className="text-primary h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Upgrade Required</DialogTitle>
          <DialogDescription className="text-center">
            <span className="font-medium">{feature}</span> is available on the{" "}
            <span className="font-medium">{requiredPlan}</span> plan and above.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted rounded-lg p-4">
          <p className="text-muted-foreground text-sm">
            Upgrade to unlock proactive cost alerts and avoid surprise bills.
            Get notified immediately when costs drift beyond your thresholds.
          </p>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Button onClick={handleUpgrade} className="gap-2">
            <Zap className="h-4 w-4" />
            View Plans
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
