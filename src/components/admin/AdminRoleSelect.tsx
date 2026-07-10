import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface AdminRoleSelectProps {
  userId: string;
  currentRoles: string[];
  onChanged: () => void;
}

/**
 * Admin-only dropdown to assign a user the role of:
 *  - admin     (full access)
 *  - moderator (worker panel access)
 *  - user      (no elevated role)
 */
const AdminRoleSelect = ({ userId, currentRoles, onChanged }: AdminRoleSelectProps) => {
  const [busy, setBusy] = useState(false);

  const current = currentRoles.includes("admin")
    ? "admin"
    : currentRoles.includes("moderator")
      ? "moderator"
      : currentRoles.includes("staff")
        ? "staff"
        : "user";

  const handleChange = async (newRole: string) => {
    if (newRole === current) return;
    setBusy(true);
    const { error } = await supabase.functions.invoke("admin-users", {
      body: { action: "assign_role", userId, role: newRole },
    });
    setBusy(false);
    if (error) {
      toast({ title: "Couldn't update role", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Role set to ${newRole}` });
      onChanged();
    }
  };

  return (
    <Select value={current} onValueChange={handleChange} disabled={busy}>
      <SelectTrigger className="h-7 w-[110px] text-xs bg-card border-border">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-card border-border">
        <SelectItem value="user" className="text-xs">User</SelectItem>
        <SelectItem value="staff" className="text-xs">Staff</SelectItem>
        <SelectItem value="moderator" className="text-xs">Moderator</SelectItem>
        <SelectItem value="admin" className="text-xs">Admin</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default AdminRoleSelect;