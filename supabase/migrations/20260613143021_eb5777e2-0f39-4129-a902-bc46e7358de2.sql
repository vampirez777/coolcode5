-- 1) Hide winner_notes from non-admins by revoking column-level SELECT
REVOKE SELECT (winner_notes) ON public.giveaways FROM authenticated;
REVOKE SELECT (winner_notes) ON public.giveaways FROM anon;
-- Admins/service queries go through service_role or RPCs that bypass column grants;
-- if admins need this column from the client, they can use a SECURITY DEFINER function.

-- 2) RLS policies on realtime.messages so users only subscribe to topics they own.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "realtime_topic_authz_select" ON realtime.messages;
DROP POLICY IF EXISTS "realtime_topic_authz_insert" ON realtime.messages;

CREATE POLICY "realtime_topic_authz_select"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    -- notifications:<user_id>
    (realtime.topic() LIKE 'notifications-%' AND split_part(realtime.topic(), '-', 2) = auth.uid()::text)
    OR (realtime.topic() LIKE 'notifications:%' AND split_part(realtime.topic(), ':', 2) = auth.uid()::text)
    -- support-tickets-<user_id>
    OR (realtime.topic() LIKE 'support-tickets-%' AND split_part(realtime.topic(), '-', 3) = auth.uid()::text)
    -- support-ticket-<ticket_id>  -- ticket must belong to user
    OR (
      realtime.topic() LIKE 'support-ticket-%'
      AND EXISTS (
        SELECT 1 FROM public.support_tickets st
        WHERE st.id::text = split_part(realtime.topic(), '-', 3)
          AND st.user_id = auth.uid()
      )
    )
    -- deal-<deal_id> or deal-messages-<deal_id>: must be participant
    OR (
      realtime.topic() LIKE 'deal-%'
      AND EXISTS (
        SELECT 1 FROM public.deals d
        WHERE d.id::text = regexp_replace(realtime.topic(), '^deal(-messages)?-', '')
          AND (d.creator_id = auth.uid() OR d.other_user_id = auth.uid())
      )
    )
  )
);

CREATE POLICY "realtime_topic_authz_insert"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);