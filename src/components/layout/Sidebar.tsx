import { NavLink, Link } from "react-router-dom";
import { Zap } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";

const navItems = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Getting Started", to: "/dashboard/getting-started" },
  { label: "Projects", to: "/dashboard/projects" },
  { label: "Deployments", to: "/dashboard/deployments" },
  { label: "Auto-Deploy", to: "/dashboard/auto-deploy" },
  { label: "Settings", to: "/dashboard/settings" },
];

export default function Sidebar() {
  const currentUser = useQuery(api.users.getCurrentUser);
  const currentPlan = currentUser?.subscription?.plan || "free";

  return (
    <div className="w-64 bg-slate-900 text-slate-100 min-h-screen p-4 flex flex-col">
      <div className="space-y-6 flex-1">
        <h2 className="text-xl font-bold mb-4">AI Deploy Agent</h2>

        <nav className="flex flex-col gap-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-4 py-2 rounded-md ${
                  isActive ? "bg-indigo-600" : "hover:bg-slate-700"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Pricing/Upgrade Card */}
      <div className="mt-auto pt-4 border-t border-slate-700">
        <Link
          to="/pricing"
          className="block p-4 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4" />
            <span className="font-semibold text-sm">
              {currentPlan === "free" ? "Upgrade Plan" : `${currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan`}
            </span>
          </div>
          <p className="text-xs opacity-90">
            {currentPlan === "free"
              ? "Unlock email & Slack alerts"
              : "Manage your subscription"}
          </p>
        </Link>
      </div>
    </div>
  );
}
