import { ReactNode } from "react";
import { useMaintenance } from "@/hooks/useMaintenance";
import { useAdmin } from "@/hooks/useAdmin";
import MaintenancePage from "@/pages/Maintenance";

/**
 * Wraps the app and shows the maintenance page when maintenance mode is on.
 * FAIL-CLOSED: only verified admins (server-checked via has_role RPC) ever
 * bypass the gate. Every route in the app is rendered as a child of this
 * gate, so there is no client-side route that can skip it. Direct deep
 * links, refresh, history manipulation, and devtools state changes all
 * still re-mount this gate and re-check the server.
 */
const MaintenanceGate = ({ children }: { children: ReactNode }) => {
  const { enabled, message, loading } = useMaintenance();
  const { isAdmin, loading: roleLoading } = useAdmin();

  // While we don't yet know maintenance state, never reveal the app.
  if (loading) return <MaintenanceLoadingScreen />;

  if (enabled) {
    // While we don't yet know the role, never reveal the app.
    if (roleLoading) return <MaintenanceLoadingScreen />;
    // Anyone who is not a verified admin sees the maintenance page —
    // moderators, staff, signed-out visitors, everyone.
    if (!isAdmin) return <MaintenancePage message={message} />;
  }

  return <>{children}</>;
};

const MaintenanceLoadingScreen = () => (
  <div className="min-h-screen w-full bg-background flex items-center justify-center p-6">
    <div className="h-8 w-8 rounded-full border-2 border-primary/25 border-t-primary animate-spin" />
  </div>
);

export default MaintenanceGate;