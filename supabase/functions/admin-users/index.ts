import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is admin
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check admin role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, userId, role } = body as { action: string; userId?: string; role?: string };

    if (action === "list") {
      // Get all auth users with emails
      const { data: { users }, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (error) throw error;
      // Fetch all role assignments in one go
      const { data: roleRows } = await adminClient
        .from("user_roles")
        .select("user_id, role");
      const rolesByUser: Record<string, string[]> = {};
      (roleRows || []).forEach((r: any) => {
        rolesByUser[r.user_id] = [...(rolesByUser[r.user_id] || []), r.role];
      });
      const mapped = (users || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        banned: !!u.banned_until && new Date(u.banned_until) > new Date(),
        banned_until: u.banned_until,
        created_at: u.created_at,
        roles: rolesByUser[u.id] || [],
      }));
      return new Response(JSON.stringify(mapped), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "ban" && userId) {
      // Ban user for 100 years
      const { error } = await adminClient.auth.admin.updateUserById(userId, {
        ban_duration: "876000h",
      });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "unban" && userId) {
      const { error } = await adminClient.auth.admin.updateUserById(userId, {
        ban_duration: "none",
      });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "assign_role" && userId && role) {
      if (!["admin", "moderator", "staff", "user"].includes(role)) {
        return new Response(JSON.stringify({ error: "Invalid role" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // 'user' = remove all elevated roles. Otherwise: clear other elevated
      // roles first (a user holds exactly one elevated role at a time), then
      // upsert the chosen one.
      if (role === "user") {
        const { error } = await adminClient
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .in("role", ["admin", "moderator", "staff"]);
        if (error) throw error;
      } else {
        const { error: delErr } = await adminClient
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .in("role", ["admin", "moderator", "staff"])
          .neq("role", role);
        if (delErr) throw delErr;
        const { error } = await adminClient
          .from("user_roles")
          .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
        if (error) throw error;
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
