import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import AuthCallback from "./pages/auth/Callback.tsx";
import Landing from "./pages/Landing.tsx";
import DashboardLayout from "./components/layout/DashboardLayout.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Projects from "./pages/Projects.tsx";
import ProjectDetail from "./pages/ProjectDetail.tsx";
import Deployments from "./pages/Deployments.tsx";
import Settings from "./pages/Settings.tsx";
import NotFound from "./pages/NotFound.tsx";
import { Skeleton } from "./components/ui/skeleton.tsx";

export default function App() {
  return (
    <DefaultProviders>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          {/* Dashboard Routes - Protected */}
          <Route
            path="/dashboard"
            element={
              <>
                <AuthLoading>
                  <div className="min-h-screen flex items-center justify-center">
                    <Skeleton className="h-64 w-full max-w-md" />
                  </div>
                </AuthLoading>
                <Unauthenticated>
                  <Landing />
                </Unauthenticated>
                <Authenticated>
                  <DashboardLayout />
                </Authenticated>
              </>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="deployments" element={<Deployments />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </DefaultProviders>
  );
}
