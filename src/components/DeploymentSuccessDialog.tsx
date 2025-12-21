import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { CheckCircle, ExternalLink, Copy, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface DeploymentSuccessDialogProps {
  open: boolean;
  onClose: () => void;
  productionUrl: string;
  projectName?: string;
}

export default function DeploymentSuccessDialog({
  open,
  onClose,
  productionUrl,
  projectName,
}: DeploymentSuccessDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(productionUrl);
      setCopied(true);
      toast.success("URL copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy URL");
    }
  };

  const handleVisit = () => {
    window.open(productionUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <DialogTitle className="text-xl">Deployment Successful! 🎉</DialogTitle>
                <DialogDescription className="mt-1">
                  {projectName ? `${projectName} is now live` : "Your app is now live on the internet"}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* URL Display */}
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
            <div className="mb-2 flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium text-green-400">Your app is live at:</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded bg-slate-950 px-3 py-2 text-sm text-green-100">
                {productionUrl}
              </code>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button onClick={handleVisit} className="flex-1" size="lg">
              <ExternalLink className="mr-2 h-4 w-4" />
              Visit Site
            </Button>
            <Button onClick={handleCopy} variant="outline" size="lg" className="flex-1">
              {copied ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy URL
                </>
              )}
            </Button>
          </div>

          {/* Info Box */}
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h4 className="mb-2 text-sm font-semibold">What's Next?</h4>
            <ul className="space-y-1.5 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Share this URL with anyone to show off your app</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Your app is live globally on Vercel's edge network</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>SSL certificate is automatically configured</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span>Deploy updates anytime by uploading a new version</span>
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
