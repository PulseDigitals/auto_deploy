import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { AlertTriangle, Rocket, Lock } from "lucide-react";
import ProviderSelector from "@/components/ProviderSelector.tsx";
import type { ProviderId } from "@/config/providers.ts";
import { hasAccess, getRequiredPlan, type SubscriptionPlan } from "@/config/plans.ts";

interface DeployModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeploy: (providerId: ProviderId, deploymentMode: "simulation" | "live") => void;
  isDeploying: boolean;
  userPlan: SubscriptionPlan;
  isPowerUser?: boolean;
}

export default function DeployModal({
  open,
  onOpenChange,
  onDeploy,
  isDeploying,
  userPlan,
  isPowerUser = false,
}: DeployModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>("vercel");
  const [enableLiveDeployment, setEnableLiveDeployment] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  // Check if user has access to live deployment
  const canUseLiveDeployment = hasAccess(userPlan, "live_deployment") || isPowerUser;
  const requiredPlan = getRequiredPlan("live_deployment");

  const handleToggleLive = (checked: boolean) => {
    setEnableLiveDeployment(checked);
    // Clear consent when toggling off
    if (!checked) {
      setConsentChecked(false);
    }
  };

  const handleDeploy = () => {
    const mode = enableLiveDeployment ? "live" : "simulation";
    onDeploy(selectedProvider, mode);
    // Reset state
    setEnableLiveDeployment(false);
    setConsentChecked(false);
  };

  const canDeploy = !enableLiveDeployment || (enableLiveDeployment && consentChecked);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Deploy Project
          </DialogTitle>
          <DialogDescription>
            Select a provider and deployment mode for your project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Provider Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Select Provider</label>
            <ProviderSelector
              value={selectedProvider}
              onChange={setSelectedProvider}
            />
          </div>

          {/* Live Deployment Toggle */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <label htmlFor="live-deployment" className="text-sm font-medium">
                    Enable Live Deployment (Advanced)
                  </label>
                  {!canUseLiveDeployment && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-300">
                      <Lock className="h-3 w-3" />
                      {requiredPlan}+
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Requires provider authorization. Charges may apply.
                </p>
              </div>
              <Switch
                id="live-deployment"
                checked={enableLiveDeployment}
                onCheckedChange={handleToggleLive}
                disabled={!canUseLiveDeployment || isDeploying}
              />
            </div>

            {/* Upgrade message for users without access */}
            {!canUseLiveDeployment && (
              <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <p className="text-xs text-orange-200">
                  <strong>Upgrade to {requiredPlan}</strong> to enable live deployments with real
                  infrastructure.
                </p>
              </div>
            )}
          </div>

          {/* Consent Gate (only shown when live deployment is enabled) */}
          {enableLiveDeployment && canUseLiveDeployment && (
            <div className="space-y-4 p-4 rounded-lg bg-orange-500/10 border-2 border-orange-500/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <div className="font-semibold text-orange-200">Live Deployment Enabled</div>
                  <p className="text-sm text-orange-200/80">
                    This will create real infrastructure on the selected provider. You may incur
                    charges. This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 pt-2">
                <Checkbox
                  id="consent"
                  checked={consentChecked}
                  onCheckedChange={(checked) => setConsentChecked(checked === true)}
                  disabled={isDeploying}
                />
                <label
                  htmlFor="consent"
                  className="text-sm leading-tight cursor-pointer select-none"
                >
                  I understand and consent to creating real infrastructure
                </label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeploying}>
            Cancel
          </Button>
          <Button onClick={handleDeploy} disabled={!canDeploy || isDeploying}>
            {isDeploying ? (
              "Deploying..."
            ) : enableLiveDeployment ? (
              "Deploy Live"
            ) : (
              "Deploy Simulation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
