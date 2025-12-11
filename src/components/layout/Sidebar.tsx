import { NavLink } from "react-router-dom";

const navItems = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Projects", to: "/dashboard/projects" },
  { label: "Deployments", to: "/dashboard/deployments" },
  { label: "Settings", to: "/dashboard/settings" },
];

export default function Sidebar() {
  return (
    <div className="w-64 bg-slate-900 text-slate-100 min-h-screen p-4 space-y-6">
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
  );
}
