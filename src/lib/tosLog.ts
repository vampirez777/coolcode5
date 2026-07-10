import { supabase } from "@/integrations/supabase/client";

interface LogToSParams {
  context: "signup" | "deal_create";
  accepted: boolean;
  attemptedWithoutAccept?: boolean;
  userId?: string | null;
  email?: string | null;
  username?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Records a Terms-of-Service acceptance / attempt event. Fire-and-forget —
 * never blocks the user flow if logging fails.
 */
export const logToSEvent = async ({
  context,
  accepted,
  attemptedWithoutAccept = false,
  userId,
  email,
  username,
  metadata,
}: LogToSParams) => {
  try {
    await supabase.from("tos_acceptances").insert({
      context,
      accepted,
      attempted_without_accept: attemptedWithoutAccept,
      user_id: userId ?? null,
      email: email ?? null,
      username: username ?? null,
      tos_version: "v1",
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      metadata: metadata ? (metadata as any) : null,
    } as any);
  } catch {
    // Swallow — auditing must never block the user
  }
};