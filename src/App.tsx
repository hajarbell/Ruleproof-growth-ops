import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RequireWorkspace, RedirectIfAuth } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

// Auth pages
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import WorkspaceSetupPage from "./pages/auth/WorkspaceSetupPage";

// App pages
import Dashboard from "./pages/Dashboard";
import LinkedInPage from "./pages/LinkedInPage";
import FacebookPage from "./pages/FacebookPage";
import ContentStudioPage from "./pages/ContentStudioPage";
import IdeasLabPage from "./pages/IdeasLabPage";
import ScrapersPage from "./pages/ScrapersPage";
import LeadsCRMPage from "./pages/LeadsCRMPage";
import CampaignsPage from "./pages/CampaignsPage";
import FilesPage from "./pages/FilesPage";
import ActivityPage from "./pages/ActivityPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public auth routes */}
            <Route element={<RedirectIfAuth />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Route>

            {/* Workspace setup (logged in, no workspace) */}
            <Route path="/setup-workspace" element={<WorkspaceSetupPage />} />

            {/* Protected app routes */}
            <Route element={<RequireWorkspace />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/linkedin" element={<LinkedInPage />} />
                <Route path="/facebook" element={<FacebookPage />} />
                <Route path="/content-studio" element={<ContentStudioPage />} />
                <Route path="/ideas-lab" element={<IdeasLabPage />} />
                <Route path="/scrapers" element={<ScrapersPage />} />
                <Route path="/leads" element={<LeadsCRMPage />} />
                <Route path="/campaigns" element={<CampaignsPage />} />
                <Route path="/files" element={<FilesPage />} />
                <Route path="/activity" element={<ActivityPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
