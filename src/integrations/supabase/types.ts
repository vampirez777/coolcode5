export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          admin_notes: string | null
          browser_id: string
          country: string | null
          created_at: string
          id: string
          ip_address: string | null
          ip_hash: string | null
          is_datacenter: boolean | null
          is_proxy: boolean | null
          is_tor: boolean | null
          is_vpn: boolean | null
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          admin_notes?: string | null
          browser_id: string
          country?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          ip_hash?: string | null
          is_datacenter?: boolean | null
          is_proxy?: boolean | null
          is_tor?: boolean | null
          is_vpn?: boolean | null
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          admin_notes?: string | null
          browser_id?: string
          country?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          ip_hash?: string | null
          is_datacenter?: boolean | null
          is_proxy?: boolean | null
          is_tor?: boolean | null
          is_vpn?: boolean | null
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: number
          maintenance_message: string | null
          maintenance_mode: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: number
          maintenance_message?: string | null
          maintenance_mode?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: number
          maintenance_message?: string | null
          maintenance_mode?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      deal_messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          created_at: string
          deal_id: string
          id: string
          message: string | null
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          created_at?: string
          deal_id: string
          id?: string
          message?: string | null
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          created_at?: string
          deal_id?: string
          id?: string
          message?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_messages_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_role_assignments: {
        Row: {
          confirmed: boolean
          created_at: string
          deal_id: string
          id: string
          picked_role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confirmed?: boolean
          created_at?: string
          deal_id: string
          id?: string
          picked_role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confirmed?: boolean
          created_at?: string
          deal_id?: string
          id?: string
          picked_role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_role_assignments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          amount: number | null
          amount_confirmed_by_creator: boolean
          amount_confirmed_by_other: boolean
          amount_creator: number | null
          amount_other: number | null
          cancel_requested_at: string | null
          cancel_requested_by: string | null
          coin: string | null
          coin_network: string | null
          created_at: string
          creator_id: string
          creator_role: string
          deal_category: string | null
          deal_description: string | null
          deal_details_confirmed_by_creator: boolean
          deal_details_confirmed_by_other: boolean
          deal_details_editing_by: string | null
          deposit_confirmed_at: string | null
          escrow_wallet_address: string | null
          fee_amount: number | null
          fee_percent: number
          fee_set_by: string | null
          fee_updated_at: string | null
          funds_released_at: string | null
          id: string
          item_delivered_at: string | null
          last_fee_change_seen_by_creator: string | null
          last_fee_change_seen_by_other: string | null
          other_user_id: string | null
          payout_hold: boolean
          payout_hold_reason: string | null
          payout_hold_set_at: string | null
          payout_hold_set_by: string | null
          payout_hold_ticket_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          amount_confirmed_by_creator?: boolean
          amount_confirmed_by_other?: boolean
          amount_creator?: number | null
          amount_other?: number | null
          cancel_requested_at?: string | null
          cancel_requested_by?: string | null
          coin?: string | null
          coin_network?: string | null
          created_at?: string
          creator_id: string
          creator_role?: string
          deal_category?: string | null
          deal_description?: string | null
          deal_details_confirmed_by_creator?: boolean
          deal_details_confirmed_by_other?: boolean
          deal_details_editing_by?: string | null
          deposit_confirmed_at?: string | null
          escrow_wallet_address?: string | null
          fee_amount?: number | null
          fee_percent?: number
          fee_set_by?: string | null
          fee_updated_at?: string | null
          funds_released_at?: string | null
          id?: string
          item_delivered_at?: string | null
          last_fee_change_seen_by_creator?: string | null
          last_fee_change_seen_by_other?: string | null
          other_user_id?: string | null
          payout_hold?: boolean
          payout_hold_reason?: string | null
          payout_hold_set_at?: string | null
          payout_hold_set_by?: string | null
          payout_hold_ticket_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          amount_confirmed_by_creator?: boolean
          amount_confirmed_by_other?: boolean
          amount_creator?: number | null
          amount_other?: number | null
          cancel_requested_at?: string | null
          cancel_requested_by?: string | null
          coin?: string | null
          coin_network?: string | null
          created_at?: string
          creator_id?: string
          creator_role?: string
          deal_category?: string | null
          deal_description?: string | null
          deal_details_confirmed_by_creator?: boolean
          deal_details_confirmed_by_other?: boolean
          deal_details_editing_by?: string | null
          deposit_confirmed_at?: string | null
          escrow_wallet_address?: string | null
          fee_amount?: number | null
          fee_percent?: number
          fee_set_by?: string | null
          fee_updated_at?: string | null
          funds_released_at?: string | null
          id?: string
          item_delivered_at?: string | null
          last_fee_change_seen_by_creator?: string | null
          last_fee_change_seen_by_other?: string | null
          other_user_id?: string | null
          payout_hold?: boolean
          payout_hold_reason?: string | null
          payout_hold_set_at?: string | null
          payout_hold_set_by?: string | null
          payout_hold_ticket_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          admin_notes: string | null
          created_at: string
          deal_id: string
          id: string
          raised_by: string
          reason: string
          resolved_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          deal_id: string
          id?: string
          raised_by: string
          reason: string
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          deal_id?: string
          id?: string
          raised_by?: string
          reason?: string
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      escrow_wallets: {
        Row: {
          coin: string
          created_at: string
          id: string
          is_active: boolean
          network: string
          updated_at: string
          wallet_address: string
        }
        Insert: {
          coin: string
          created_at?: string
          id?: string
          is_active?: boolean
          network: string
          updated_at?: string
          wallet_address: string
        }
        Update: {
          coin?: string
          created_at?: string
          id?: string
          is_active?: boolean
          network?: string
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          flag_key: string
          id: string
          label: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          flag_key: string
          id?: string
          label: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          flag_key?: string
          id?: string
          label?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      fee_history: {
        Row: {
          changed_by: string
          created_at: string
          deal_id: string
          id: string
          new_percent: number
          note: string | null
          old_percent: number
        }
        Insert: {
          changed_by: string
          created_at?: string
          deal_id: string
          id?: string
          new_percent: number
          note?: string | null
          old_percent: number
        }
        Update: {
          changed_by?: string
          created_at?: string
          deal_id?: string
          id?: string
          new_percent?: number
          note?: string | null
          old_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "fee_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      gate_blocks: {
        Row: {
          browser_id: string
          created_at: string
          id: string
          ip_hash: string | null
          metadata: Json | null
          reason: string
          risk_score: number
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          browser_id: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          reason?: string
          risk_score?: number
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          browser_id?: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          reason?: string
          risk_score?: number
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      giveaway_entries: {
        Row: {
          created_at: string
          eligibility_reason: string
          giveaway_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          eligibility_reason: string
          giveaway_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          eligibility_reason?: string
          giveaway_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "giveaway_entries_giveaway_id_fkey"
            columns: ["giveaway_id"]
            isOneToOne: false
            referencedRelation: "giveaways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "giveaway_entries_giveaway_id_fkey"
            columns: ["giveaway_id"]
            isOneToOne: false
            referencedRelation: "giveaways_public"
            referencedColumns: ["id"]
          },
        ]
      }
      giveaways: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          ends_at: string
          entry_requirements: string | null
          id: string
          image_url: string | null
          is_active: boolean
          prize: string
          title: string
          updated_at: string
          winner_notes: string | null
          winners_count: number
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          ends_at: string
          entry_requirements?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          prize: string
          title: string
          updated_at?: string
          winner_notes?: string | null
          winners_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string
          entry_requirements?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          prize?: string
          title?: string
          updated_at?: string
          winner_notes?: string | null
          winners_count?: number
        }
        Relationships: []
      }
      global_security_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          enabled: boolean
          label: string
          setting_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          label: string
          setting_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          label?: string
          setting_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      live_announcements: {
        Row: {
          body: string | null
          created_at: string
          created_by: string
          cta_label: string | null
          cta_url: string | null
          duration_ms: number
          expires_at: string
          id: string
          title: string
          variant: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by: string
          cta_label?: string | null
          cta_url?: string | null
          duration_ms?: number
          expires_at?: string
          id?: string
          title: string
          variant?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string
          cta_label?: string | null
          cta_url?: string | null
          duration_ms?: number
          expires_at?: string
          id?: string
          title?: string
          variant?: string
        }
        Relationships: []
      }
      magic_invite_links: {
        Row: {
          created_at: string
          created_by: string
          deal_id: string
          id: string
          last_used_at: string | null
          preset_avg_deal_seconds: number | null
          preset_total_deals: number | null
          preset_total_usd: number | null
          revoked_at: string | null
          target_role: string
          target_user_id: string
          token_hash: string
          updated_at: string
          use_count: number
        }
        Insert: {
          created_at?: string
          created_by: string
          deal_id: string
          id?: string
          last_used_at?: string | null
          preset_avg_deal_seconds?: number | null
          preset_total_deals?: number | null
          preset_total_usd?: number | null
          revoked_at?: string | null
          target_role: string
          target_user_id: string
          token_hash: string
          updated_at?: string
          use_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          deal_id?: string
          id?: string
          last_used_at?: string | null
          preset_avg_deal_seconds?: number | null
          preset_total_deals?: number | null
          preset_total_usd?: number | null
          revoked_at?: string | null
          target_role?: string
          target_user_id?: string
          token_hash?: string
          updated_at?: string
          use_count?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          deal_id: string | null
          id: string
          is_read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          is_read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          is_read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      pow_challenges: {
        Row: {
          challenge: string
          consumed: boolean
          created_at: string
          difficulty: number
          expires_at: string
          id: string
          ip_hash: string | null
        }
        Insert: {
          challenge: string
          consumed?: boolean
          created_at?: string
          difficulty?: number
          expires_at?: string
          id?: string
          ip_hash?: string | null
        }
        Update: {
          challenge?: string
          consumed?: boolean
          created_at?: string
          difficulty?: number
          expires_at?: string
          id?: string
          ip_hash?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          preset_avg_deal_seconds: number | null
          preset_total_deals: number | null
          preset_total_usd: number | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          preset_avg_deal_seconds?: number | null
          preset_total_deals?: number | null
          preset_total_usd?: number | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          preset_avg_deal_seconds?: number | null
          preset_total_deals?: number | null
          preset_total_usd?: number | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      security_action_otps: {
        Row: {
          action_key: string
          attempts: number
          code_hash: string
          consumed: boolean
          created_at: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          action_key: string
          attempts?: number
          code_hash: string
          consumed?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          user_id: string
        }
        Update: {
          action_key?: string
          attempts?: number
          code_hash?: string
          consumed?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          country: string | null
          created_at: string
          error_codes: string[] | null
          event_type: string
          id: string
          ip_address: string | null
          ip_hash: string | null
          is_datacenter: boolean | null
          is_proxy: boolean | null
          is_tor: boolean | null
          is_vpn: boolean | null
          metadata: Json | null
          success: boolean | null
          user_agent: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          error_codes?: string[] | null
          event_type: string
          id?: string
          ip_address?: string | null
          ip_hash?: string | null
          is_datacenter?: boolean | null
          is_proxy?: boolean | null
          is_tor?: boolean | null
          is_vpn?: boolean | null
          metadata?: Json | null
          success?: boolean | null
          user_agent?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          error_codes?: string[] | null
          event_type?: string
          id?: string
          ip_address?: string | null
          ip_hash?: string | null
          is_datacenter?: boolean | null
          is_proxy?: boolean | null
          is_tor?: boolean | null
          is_vpn?: boolean | null
          metadata?: Json | null
          success?: boolean | null
          user_agent?: string | null
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          deal_id: string | null
          id: string
          status: string
          subject: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deal_id?: string | null
          id?: string
          status?: string
          subject?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string | null
          id?: string
          status?: string
          subject?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tos_acceptances: {
        Row: {
          accepted: boolean
          attempted_without_accept: boolean
          context: string
          created_at: string
          email: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          tos_version: string
          user_agent: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          accepted: boolean
          attempted_without_accept?: boolean
          context: string
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          tos_version?: string
          user_agent?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          accepted?: boolean
          attempted_without_accept?: boolean
          context?: string
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          tos_version?: string
          user_agent?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_security_prefs: {
        Row: {
          created_at: string
          personal_2fa_threshold_usd: number | null
          require_2fa_on_release: boolean
          require_captcha_on_release: boolean
          require_confirm_prompt: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          personal_2fa_threshold_usd?: number | null
          require_2fa_on_release?: boolean
          require_captcha_on_release?: boolean
          require_confirm_prompt?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          personal_2fa_threshold_usd?: number | null
          require_2fa_on_release?: boolean
          require_captcha_on_release?: boolean
          require_confirm_prompt?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vpn_otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed: boolean
          created_at: string
          email_hash: string
          expires_at: string
          id: string
          ip_hash: string | null
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed?: boolean
          created_at?: string
          email_hash: string
          expires_at?: string
          id?: string
          ip_hash?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed?: boolean
          created_at?: string
          email_hash?: string
          expires_at?: string
          id?: string
          ip_hash?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      giveaways_public: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          ends_at: string | null
          entry_requirements: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          prize: string | null
          title: string | null
          updated_at: string | null
          winners_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          entry_requirements?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          prize?: string | null
          title?: string | null
          updated_at?: string | null
          winners_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          entry_requirements?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          prize?: string | null
          title?: string | null
          updated_at?: string | null
          winners_count?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_deal_counterparty: {
        Args: { _deal_id: string; _other_user_id: string }
        Returns: {
          amount: number | null
          amount_confirmed_by_creator: boolean
          amount_confirmed_by_other: boolean
          amount_creator: number | null
          amount_other: number | null
          cancel_requested_at: string | null
          cancel_requested_by: string | null
          coin: string | null
          coin_network: string | null
          created_at: string
          creator_id: string
          creator_role: string
          deal_category: string | null
          deal_description: string | null
          deal_details_confirmed_by_creator: boolean
          deal_details_confirmed_by_other: boolean
          deal_details_editing_by: string | null
          deposit_confirmed_at: string | null
          escrow_wallet_address: string | null
          fee_amount: number | null
          fee_percent: number
          fee_set_by: string | null
          fee_updated_at: string | null
          funds_released_at: string | null
          id: string
          item_delivered_at: string | null
          last_fee_change_seen_by_creator: string | null
          last_fee_change_seen_by_other: string | null
          other_user_id: string | null
          payout_hold: boolean
          payout_hold_reason: string | null
          payout_hold_set_at: string | null
          payout_hold_set_by: string | null
          payout_hold_ticket_id: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "deals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      find_profile_for_invite: {
        Args: { _username: string }
        Returns: {
          display_name: string
          user_id: string
          username: string
        }[]
      }
      get_public_security_flags: {
        Args: never
        Returns: {
          enabled: boolean
          setting_key: string
        }[]
      }
      get_username: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_browser_blocked: { Args: { _browser_id: string }; Returns: boolean }
      is_deal_participant: {
        Args: { _deal_id: string; _user_id: string }
        Returns: boolean
      }
      is_moderator_or_admin: { Args: { _user_id: string }; Returns: boolean }
      is_username_available: { Args: { _username: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      user_has_completed_deal: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "staff"],
    },
  },
} as const
