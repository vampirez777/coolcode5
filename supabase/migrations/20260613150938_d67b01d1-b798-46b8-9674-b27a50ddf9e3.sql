DROP POLICY IF EXISTS "Authenticated can view giveaways" ON public.giveaways;

-- Non-admin authenticated users may view giveaways but cannot read winner_notes (column privilege already revoked previously). 
-- Restrict their row access via a column-aware policy by making the broad policy stay row-permissive while column-level GRANT excludes winner_notes.
CREATE POLICY "Authenticated can view giveaway public columns"
ON public.giveaways
FOR SELECT
TO authenticated
USING (true);

-- Re-assert column grants (idempotent): authenticated can read all columns EXCEPT winner_notes; admins use service_role / separate admin policy for full access via direct edge functions if needed.
REVOKE SELECT ON public.giveaways FROM authenticated;
GRANT SELECT (id, title, description, prize, image_url, winners_count, entry_requirements, ends_at, is_active, created_by, created_at, updated_at) ON public.giveaways TO authenticated;
GRANT SELECT ON public.giveaways TO service_role;