import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import TermsOfService from "./pages/TermsOfService.tsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.tsx";
import NotFound from "./pages/NotFound.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Deals from "./pages/Deals.tsx";
import Support from "./pages/Support.tsx";
import Settings from "./pages/Settings.tsx";
import Admin from "./pages/Admin.tsx";
import Worker from "./pages/Worker.tsx";
import Staff from "./pages/Staff.tsx";
import MagicInviteClaim from "./pages/MagicInviteClaim.tsx";
import Giveaway from "./pages/Giveaway.tsx";
import MaintenanceGate from "./components/MaintenanceGate";
import EntryGate from "./components/captcha/EntryGate";
import LiveAnnouncementPopup from "./components/LiveAnnouncementPopup";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const queryClient = new QueryClient();

const DASH_CSS_FILES = [
  "/dash-source/css/1764582d9f137bbe.css",
  "/dash-source/css/a97eacd973338313.css",
  "/dash-source/css/e3ab2e5b8f62e77f.css",
  "/dash-source/css/554f355ae40bfd5a.css",
  "/dash-source/css/155a1be832d0e87e.css",
  "/dash-source/css/b29dfe98d6f3bd41.css",
  "/dash-source/css/b1654503c63232b3.css",
  "/dash-source/css/dd6161760652f492.css",
  "/dash-source/css/efc77282aed9a465.css",
  "/dash-source/css/inline_styles.css",
  "/dash-source/css/lovable-dash-fixes.css",
];

const RouteStyleLoader = () => {
  const location = useLocation();

  useEffect(() => {
    if (!["/dashboard", "/deals", "/support", "/settings", "/admin", "/worker", "/staff", "/giveaway"].some((route) => location.pathname === route || location.pathname.startsWith(`${route}/`))) return;
    document.documentElement.style.background = "#090909";
    document.body.style.background = "#090909";
    DASH_CSS_FILES.forEach((href) => {
      if (document.querySelector(`link[href="${href}"]`)) return;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    });
  }, [location.pathname]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RouteStyleLoader />
          <MaintenanceGate>
          <EntryGate>
            <LiveAnnouncementPopup />
            <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/support" element={<Support />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/worker" element={<Worker />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/magic-invite/:token" element={<MagicInviteClaim />} />
          <Route path="/deals/join" element={<MagicInviteClaim />} />
          <Route path="/giveaway" element={<Giveaway />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
            </Routes>
          </EntryGate>
          </MaintenanceGate>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
