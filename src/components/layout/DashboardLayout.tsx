import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.tsx";
import Topbar from "./Topbar.tsx";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
