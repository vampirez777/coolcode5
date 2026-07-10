-- Revoke winner_notes column access from regular authenticated users
-- and grant SELECT only on non-sensitive columns. Admins (and service_role)
-- retain full row access via table-level grants.

REVOKE SELECT ON public.giveaways FROM authenticated;

GRANT SELECT
  (id, title, description, prize, image_url, winners_count,
   entry_requirements, ends_at, is_active, created_by, created_at, updated_at)
  ON public.giveaways TO authenticated;

-- Admin-only SELECT policy for winner_notes is enforced at the column-grant
-- layer above. Existing RLS SELECT policy ("Authenticated can view giveaways"
-- USING true) stays so non-sensitive fields remain readable; sensitive column
-- is blocked at the privilege layer for non-admin authenticated callers.

-- Keep service_role unrestricted (edge functions / admin tools)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.giveaways TO service_role;