import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import {
  RequireWorkspace,
  RedirectIfAuth,
} from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

import Dashboard from "@/pages/Dashboard";
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import WorkspaceSetupPage from "@/pages/auth/WorkspaceSetupPage";
import InvitePage from "@/pages/InvitePage";
import LinkedInPage from "@/pages/LinkedInPage";
import FacebookPage from "@/pages/FacebookPage";
import ContentStudioPage from "@/pages/ContentStudioPage";
import IdeasLabPage from "@/pages/IdeasLabPage";
import ScrapersPage from "@/pages/ScrapersPage";
import LeadsCRMPage from "@/pages/LeadsCRMPage";
import CampaignsPage from "@/pages/CampaignsPage";
import FilesPage from "@/pages/FilesPage";
import ActivityPage from "@/pages/ActivityPage";
import SettingsPage from "@/pages/SettingsPage";
import LoggedOutPage from "@/pages/auth/LoggedOutPage";
import NotFound from "@/pages/NotFound";
import EngagementPage from "@/pages/EngagementPage";
import SaveProfilePage from "@/pages/SaveProfilePage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* PUBLIC — redirects to app if already logged in */}
          <Route element={<RedirectIfAuth />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          {/* Signed-out confirmation */}
          <Route path="/logged-out" element={<LoggedOutPage />} />

          {/* Workspace setup / rejoin */}
          <Route path="/setup-workspace" element={<WorkspaceSetupPage />} />

          {/* Invite link */}
          <Route path="/invite/:token" element={<InvitePage />} />

          {/* PROTECTED — requires auth + workspace */}
          <Route element={<RequireWorkspace />}>
            {/* Save profile popup — opened by bookmarklet, no sidebar */}
            <Route path="/save-profile" element={<SaveProfilePage />} />

            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/linkedin" element={<LinkedInPage />} />
              <Route path="/facebook" element={<FacebookPage />} />
              <Route path="/content" element={<ContentStudioPage />} />
              <Route path="/ideas" element={<IdeasLabPage />} />
              <Route path="/scrapers" element={<ScrapersPage />} />
              <Route path="/leads" element={<LeadsCRMPage />} />
              <Route path="/campaigns" element={<CampaignsPage />} />
              <Route path="/files" element={<FilesPage />} />
              <Route path="/activity" element={<ActivityPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/engagement" element={<EngagementPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
