-- Restore deal validation and automation triggers.
DROP TRIGGER IF EXISTS validate_deal_status_trigger ON public.deals;
CREATE TRIGGER validate_deal_status_trigger
BEFORE INSERT OR UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.validate_deal_status();

DROP TRIGGER IF EXISTS validate_deal_creator_role_trigger ON public.deals;
CREATE TRIGGER validate_deal_creator_role_trigger
BEFORE INSERT OR UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.validate_deal_creator_role();

DROP TRIGGER IF EXISTS update_deals_updated_at ON public.deals;
CREATE TRIGGER update_deals_updated_at
BEFORE UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS guard_deal_admin_fields_trigger ON public.deals;
CREATE TRIGGER guard_deal_admin_fields_trigger
BEFORE UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.guard_deal_admin_fields();

DROP TRIGGER IF EXISTS handle_deal_fee_change_trigger ON public.deals;
CREATE TRIGGER handle_deal_fee_change_trigger
AFTER UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.handle_deal_fee_change();

DROP TRIGGER IF EXISTS handle_deal_payout_hold_trigger ON public.deals;
CREATE TRIGGER handle_deal_payout_hold_trigger
BEFORE UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.handle_deal_payout_hold();

DROP TRIGGER IF EXISTS notify_deal_status_change_trigger ON public.deals;
CREATE TRIGGER notify_deal_status_change_trigger
AFTER UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.notify_deal_status_change();

DROP TRIGGER IF EXISTS post_deal_status_chat_message_trigger ON public.deals;
CREATE TRIGGER post_deal_status_chat_message_trigger
AFTER UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.post_deal_status_chat_message();

DROP TRIGGER IF EXISTS notify_deal_invitation_trigger ON public.deals;
CREATE TRIGGER notify_deal_invitation_trigger
AFTER UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.notify_deal_invitation();

DROP TRIGGER IF EXISTS clear_cancel_request_on_status_change_trigger ON public.deals;
CREATE TRIGGER clear_cancel_request_on_status_change_trigger
BEFORE UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.clear_cancel_request_on_status_change();

DROP TRIGGER IF EXISTS notify_cancel_request_trigger ON public.deals;
CREATE TRIGGER notify_cancel_request_trigger
AFTER UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.notify_cancel_request();

-- Restore deal role assignment triggers.
DROP TRIGGER IF EXISTS reset_role_confirmations_on_change_trigger ON public.deal_role_assignments;
CREATE TRIGGER reset_role_confirmations_on_change_trigger
BEFORE UPDATE ON public.deal_role_assignments
FOR EACH ROW EXECUTE FUNCTION public.reset_role_confirmations_on_change();

DROP TRIGGER IF EXISTS reset_other_role_confirmation_trigger ON public.deal_role_assignments;
CREATE TRIGGER reset_other_role_confirmation_trigger
AFTER UPDATE ON public.deal_role_assignments
FOR EACH ROW EXECUTE FUNCTION public.reset_other_role_confirmation();

DROP TRIGGER IF EXISTS handle_role_assignment_agreement_trigger ON public.deal_role_assignments;
CREATE TRIGGER handle_role_assignment_agreement_trigger
AFTER INSERT OR UPDATE ON public.deal_role_assignments
FOR EACH ROW EXECUTE FUNCTION public.handle_role_assignment_agreement();

DROP TRIGGER IF EXISTS update_deal_role_assignments_updated_at ON public.deal_role_assignments;
CREATE TRIGGER update_deal_role_assignments_updated_at
BEFORE UPDATE ON public.deal_role_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Restore message/dispute/status validation triggers.
DROP TRIGGER IF EXISTS notify_new_message_trigger ON public.deal_messages;
CREATE TRIGGER notify_new_message_trigger
AFTER INSERT ON public.deal_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

DROP TRIGGER IF EXISTS handle_dispute_created_trigger ON public.disputes;
CREATE TRIGGER handle_dispute_created_trigger
AFTER INSERT ON public.disputes
FOR EACH ROW EXECUTE FUNCTION public.handle_dispute_created();

DROP TRIGGER IF EXISTS update_disputes_updated_at ON public.disputes;
CREATE TRIGGER update_disputes_updated_at
BEFORE UPDATE ON public.disputes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS validate_access_request_status_trigger ON public.access_requests;
CREATE TRIGGER validate_access_request_status_trigger
BEFORE INSERT OR UPDATE ON public.access_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_access_request_status();

DROP TRIGGER IF EXISTS guard_user_roles_writes_trigger ON public.user_roles;
CREATE TRIGGER guard_user_roles_writes_trigger
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.guard_user_roles_writes();

-- Re-enable the switches directly blocking the reported flows.
UPDATE public.feature_flags
SET enabled = true, updated_at = now()
WHERE flag_key IN ('signups', 'magic_invite_claim');