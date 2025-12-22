import { Check, Zap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { Link } from "react-router-dom";

type PlanType = "free" | "pro" | "team" | "enterprise";

interface PricingTier {
  name: string;
  plan: PlanType;
  price: string;
  description: string;
  features: string[];
  popular?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    name: "Free",
    plan: "free",
    price: "$0",
    description: "Dashboard cost view only",
    features: [
      "Unlimited projects",
      "Dashboard cost view",
      "Basic deployment logs",
      "Community support",
    ],
  },
  {
    name: "Pro",
    plan: "pro",
    price: "$19",
    description: "Email alerts for proactive monitoring",
    features: [
      "Everything in Free",
      "Email cost alerts",
      "Alert history",
      "Priority support",
    ],
    popular: true,
  },
  {
    name: "Team",
    plan: "team",
    price: "$49",
    description: "Full team collaboration features",
    features: [
      "Everything in Pro",
      "Slack alerts",
      "Team collaboration",
      "Advanced analytics",
    ],
  },
  {
    name: "Enterprise",
    plan: "enterprise",
    price: "Custom",
    description: "Custom thresholds and webhooks",
    features: [
      "Everything in Team",
      "Custom alert thresholds",
      "Webhook integrations",
      "Dedicated support",
    ],
  },
];

export default function Pricing() {
  const currentUser = useQuery(api.users.getCurrentUser);
  const updatePlan = useMutation(api.users.updateUserPlan);

  const currentPlan = currentUser?.subscription?.plan || "free";

  const handleUpgrade = async (plan: PlanType) => {
    if (plan === currentPlan) {
      toast.info("You're already on this plan");
      return;
    }

    try {
      await updatePlan({ plan });
      toast.success(`Successfully upgraded to ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan`);
    } catch (error) {
      toast.error("Failed to update plan");
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <img 
            src="https://cdn.hercules.app/file_VyVWXRitxQHVzP57VWFwDRyQ" 
            alt="1-Click auto Deploy" 
            className="h-16 w-auto"
          />
        </div>
        
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg">
            Unlock proactive cost alerts and avoid surprise bills
          </p>
          {currentUser && (
            <div className="mt-4">
              <Badge variant="outline" className="text-base px-4 py-2">
                Current Plan: {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
              </Badge>
            </div>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {pricingTiers.map((tier) => (
            <Card
              key={tier.plan}
              className={`relative flex flex-col ${
                tier.popular ? "border-primary shadow-lg" : ""
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="gap-1">
                    <Zap className="h-3 w-3" />
                    Popular
                  </Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {tier.name}
                  {currentPlan === tier.plan && (
                    <Badge variant="outline">Current</Badge>
                  )}
                </CardTitle>
                <CardDescription>{tier.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  {tier.price !== "Custom" && (
                    <span className="text-muted-foreground">/month</span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="text-primary mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={tier.popular ? "default" : "outline"}
                  disabled={currentPlan === tier.plan}
                  onClick={() => handleUpgrade(tier.plan)}
                >
                  {currentPlan === tier.plan
                    ? "Current Plan"
                    : tier.plan === "enterprise"
                      ? "Contact Sales"
                      : "Upgrade"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground text-sm">
            All plans include unlimited projects and deployments
          </p>
        </div>
      </div>
    </div>
  );
}
