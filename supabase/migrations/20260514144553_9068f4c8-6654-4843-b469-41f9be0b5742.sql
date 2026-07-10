-- Remove duplicate trigger names from the repair pass; original triggers remain active.
DROP TRIGGER IF EXISTS validate_deal_status_trigger ON public.deals;
DROP TRIGGER IF EXISTS validate_deal_creator_role_trigger ON public.deals;
DROP TRIGGER IF EXISTS update_deals_updated_at ON public.deals;
DROP TRIGGER IF EXISTS guard_deal_admin_fields_trigger ON public.deals;
DROP TRIGGER IF EXISTS handle_deal_fee_change_trigger ON public.deals;
DROP TRIGGER IF EXISTS handle_deal_payout_hold_trigger ON public.deals;
DROP TRIGGER IF EXISTS notify_deal_status_change_trigger ON public.deals;
DROP TRIGGER IF EXISTS post_deal_status_chat_message_trigger ON public.deals;
DROP TRIGGER IF EXISTS notify_deal_invitation_trigger ON public.deals;
DROP TRIGGER IF EXISTS clear_cancel_request_on_status_change_trigger ON public.deals;
DROP TRIGGER IF EXISTS notify_cancel_request_trigger ON public.deals;

DROP TRIGGER IF EXISTS reset_role_confirmations_on_change_trigger ON public.deal_role_assignments;
DROP TRIGGER IF EXISTS reset_other_role_confirmation_trigger ON public.deal_role_assignments;
DROP TRIGGER IF EXISTS handle_role_assignment_agreement_trigger ON public.deal_role_assignments;
DROP TRIGGER IF EXISTS update_deal_role_assignments_updated_at ON public.deal_role_assignments;

DROP TRIGGER IF EXISTS notify_new_message_trigger ON public.deal_messages;
DROP TRIGGER IF EXISTS handle_dispute_created_trigger ON public.disputes;
DROP TRIGGER IF EXISTS update_disputes_updated_at ON public.disputes;
DROP TRIGGER IF EXISTS validate_access_request_status_trigger ON public.access_requests;
DROP TRIGGER IF EXISTS guard_user_roles_writes_trigger ON public.user_roles;