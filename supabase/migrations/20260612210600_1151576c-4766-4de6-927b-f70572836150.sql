
ALTER TABLE public.user_roles DISABLE TRIGGER USER;

DO $$
DECLARE
  keep_uid uuid := '4ce44934-d44e-417c-8885-d936816b265d';
BEGIN
  TRUNCATE TABLE
    public.deal_messages,
    public.deal_role_assignments,
    public.disputes,
    public.fee_history,
    public.escrow_wallets,
    public.support_messages,
    public.support_tickets,
    public.notifications,
    public.magic_invite_links,
    public.giveaway_entries,
    public.giveaways,
    public.live_announcements,
    public.tos_acceptances,
    public.access_requests,
    public.gate_blocks,
    public.pow_challenges,
    public.security_action_otps,
    public.security_events,
    public.vpn_otp_codes,
    public.email_send_log,
    public.email_send_state,
    public.email_unsubscribe_tokens,
    public.suppressed_emails,
    public.feature_flags,
    public.app_settings,
    public.deals
  RESTART IDENTITY CASCADE;

  DELETE FROM public.user_security_prefs WHERE user_id <> keep_uid;
  DELETE FROM public.user_roles         WHERE user_id <> keep_uid;
  DELETE FROM public.profiles           WHERE user_id <> keep_uid;
  DELETE FROM auth.users                WHERE id      <> keep_uid;
END $$;

ALTER TABLE public.user_roles ENABLE TRIGGER USER;
