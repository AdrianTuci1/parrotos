import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginView } from "@/components/shell/LoginView";
import { DashboardPage } from "@/components/shell/DashboardPage";
import { PublicAnalyticsPage } from "@/components/shell/PublicAnalyticsPage";
import { useAppStore } from "@/stores/useAppStore";

function ProtectedRoute({ children }) {
  const { currentUser, devMode } = useAppStore();
  if (devMode || currentUser) return children;
  return <Navigate to="/login" replace />;
}

export default function App() {
  const { devMode, demoMode } = useAppStore();
  const defaultRoute = (devMode && demoMode) ? "/app/home" : "/login";

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={defaultRoute} replace />} />
        <Route path="/login" element={<LoginView />} />
        <Route path="/app" element={<Navigate to="/app/home" replace />} />

        {/* Public analytics link: /p/:token */}
        <Route path="/p/:token" element={<PublicAnalyticsPage />} />

        {/* Account (no org): /app/home, /app/organizations, /app/billing */}
        <Route path="/app/:section" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

        {/* Organization: /app/:orgSlug/:section */}
        <Route path="/app/:orgSlug/:section" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

        {/* Project: /app/:orgSlug/:projectSlug/:section */}
        <Route path="/app/:orgSlug/:projectSlug/:section" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to={defaultRoute} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
