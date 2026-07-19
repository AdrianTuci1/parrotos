import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginView } from "@/components/shell/LoginView";
import { DashboardPage } from "@/components/shell/DashboardPage";
import { PublicAnalyticsPage } from "@/components/shell/PublicAnalyticsPage";
import { SettingsPage } from "@/components/shell/SettingsPage";
import { useAppStore } from "@/stores/useAppStore";

function ProtectedRoute({ children }) {
  const { currentUser, devMode, authInitialized } = useAppStore();
  if (devMode) return children;
  if (!authInitialized) return null;
  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { devMode, demoMode, initializeSession } = useAppStore();
  const defaultRoute = (devMode && demoMode) ? "/app" : "/login";

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={defaultRoute} replace />} />
        <Route path="/login" element={<LoginView />} />
        <Route path="/app" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

        {/* Public analytics link: /p/:token */}
        <Route path="/p/:token" element={<PublicAnalyticsPage />} />

        {/* Organization: /app/:orgSlug */}
        <Route path="/app/:orgSlug" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/app/:orgSlug/:section" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

        {/* Project: /app/:orgSlug/:projectSlug/:section */}
        <Route path="/app/:orgSlug/:projectSlug/:section" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

        {/* Global settings */}
        <Route path="/settings/*" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to={defaultRoute} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
