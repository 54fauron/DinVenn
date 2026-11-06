// Generated from local Supabase. Regenerate with npm run db:types.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      analytics_events: {
        Row: {
          business_id: string;
          created_at: string;
          event_type: Database["public"]["Enums"]["analytics_event_type"];
          id: number;
          target_id: string;
          target_type: Database["public"]["Enums"]["analytics_target"];
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          event_type: Database["public"]["Enums"]["analytics_event_type"];
          id?: never;
          target_id: string;
          target_type: Database["public"]["Enums"]["analytics_target"];
          user_id?: string | null;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          event_type?: Database["public"]["Enums"]["analytics_event_type"];
          id?: never;
          target_id?: string;
          target_type?: Database["public"]["Enums"]["analytics_target"];
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "analytics_events_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "analytics_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "analytics_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          business_id: string | null;
          created_at: string;
          id: number;
          new_data: Json | null;
          old_data: Json | null;
          row_id: string | null;
          table_name: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          business_id?: string | null;
          created_at?: string;
          id?: never;
          new_data?: Json | null;
          old_data?: Json | null;
          row_id?: string | null;
          table_name: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          business_id?: string | null;
          created_at?: string;
          id?: never;
          new_data?: Json | null;
          old_data?: Json | null;
          row_id?: string | null;
          table_name?: string;
        };
        Relationships: [];
      };
      badges: {
        Row: {
          description: string | null;
          icon: string | null;
          id: number;
          name: string;
          slug: string;
        };
        ComputedFields: never;
        Insert: {
          description?: string | null;
          icon?: string | null;
          id?: number;
          name: string;
          slug: string;
        };
        Update: {
          description?: string | null;
          icon?: string | null;
          id?: number;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      business_claims: {
        Row: {
          business_id: string;
          claimant_id: string;
          created_at: string;
          evidence_url: string | null;
          id: string;
          message: string | null;
          org_number: string | null;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["claim_status"];
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          claimant_id: string;
          created_at?: string;
          evidence_url?: string | null;
          id?: string;
          message?: string | null;
          org_number?: string | null;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["claim_status"];
        };
        Update: {
          business_id?: string;
          claimant_id?: string;
          created_at?: string;
          evidence_url?: string | null;
          id?: string;
          message?: string | null;
          org_number?: string | null;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["claim_status"];
        };
        Relationships: [
          {
            foreignKeyName: "business_claims_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_claims_claimant_id_fkey";
            columns: ["claimant_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_claims_claimant_id_fkey";
            columns: ["claimant_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_claims_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_claims_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      business_images: {
        Row: {
          business_id: string;
          id: string;
          image_url: string;
          sort_order: number | null;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          id?: string;
          image_url: string;
          sort_order?: number | null;
        };
        Update: {
          business_id?: string;
          id?: string;
          image_url?: string;
          sort_order?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "business_images_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      business_members: {
        Row: {
          business_id: string;
          member_role: Database["public"]["Enums"]["member_role"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          member_role?: Database["public"]["Enums"]["member_role"];
          user_id: string;
        };
        Update: {
          business_id?: string;
          member_role?: Database["public"]["Enums"]["member_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      business_tags: {
        Row: {
          business_id: string;
          tag_id: number;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          tag_id: number;
        };
        Update: {
          business_id?: string;
          tag_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "business_tags_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      businesses: {
        Row: {
          address: string | null;
          category_id: number | null;
          city: string | null;
          cover_url: string | null;
          created_at: string;
          description: string | null;
          email: string | null;
          id: string;
          instagram: string | null;
          is_claimed: boolean;
          is_featured: boolean;
          lat: number | null;
          lng: number | null;
          logo_url: string | null;
          name: string;
          neighborhood_id: number | null;
          org_number: string | null;
          org_verified_at: string | null;
          owner_id: string | null;
          phone: string | null;
          postal_code: string | null;
          slug: string;
          status: Database["public"]["Enums"]["business_status"];
          website: string | null;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          category_id?: number | null;
          city?: string | null;
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          email?: string | null;
          id?: string;
          instagram?: string | null;
          is_claimed?: boolean;
          is_featured?: boolean;
          lat?: number | null;
          lng?: number | null;
          logo_url?: string | null;
          name: string;
          neighborhood_id?: number | null;
          org_number?: string | null;
          org_verified_at?: string | null;
          owner_id?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          slug: string;
          status?: Database["public"]["Enums"]["business_status"];
          website?: string | null;
        };
        Update: {
          address?: string | null;
          category_id?: number | null;
          city?: string | null;
          cover_url?: string | null;
          created_at?: string;
          description?: string | null;
          email?: string | null;
          id?: string;
          instagram?: string | null;
          is_claimed?: boolean;
          is_featured?: boolean;
          lat?: number | null;
          lng?: number | null;
          logo_url?: string | null;
          name?: string;
          neighborhood_id?: number | null;
          org_number?: string | null;
          org_verified_at?: string | null;
          owner_id?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["business_status"];
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "businesses_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "businesses_neighborhood_id_fkey";
            columns: ["neighborhood_id"];
            isOneToOne: false;
            referencedRelation: "neighborhoods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "businesses_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "businesses_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          color: string | null;
          icon: string | null;
          id: number;
          name: string;
          slug: string;
        };
        ComputedFields: never;
        Insert: {
          color?: string | null;
          icon?: string | null;
          id?: number;
          name: string;
          slug: string;
        };
        Update: {
          color?: string | null;
          icon?: string | null;
          id?: number;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      deal_redemptions: {
        Row: {
          deal_id: string;
          expires_at: string;
          id: string;
          is_first_time: boolean | null;
          issued_at: string;
          party_size: number;
          redeemed_at: string | null;
          shared_deal_id: string | null;
          status: Database["public"]["Enums"]["redemption_state"];
          token: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          deal_id: string;
          expires_at?: string;
          id?: string;
          is_first_time?: boolean | null;
          issued_at?: string;
          party_size?: number;
          redeemed_at?: string | null;
          shared_deal_id?: string | null;
          status?: Database["public"]["Enums"]["redemption_state"];
          token?: string;
          user_id: string;
        };
        Update: {
          deal_id?: string;
          expires_at?: string;
          id?: string;
          is_first_time?: boolean | null;
          issued_at?: string;
          party_size?: number;
          redeemed_at?: string | null;
          shared_deal_id?: string | null;
          status?: Database["public"]["Enums"]["redemption_state"];
          token?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deal_redemptions_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "active_deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deal_redemptions_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deal_redemptions_shared_deal_id_fkey";
            columns: ["shared_deal_id"];
            isOneToOne: false;
            referencedRelation: "shared_deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deal_redemptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deal_redemptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      deal_schedules: {
        Row: {
          deal_id: string;
          ends_time: string;
          id: string;
          starts_time: string;
          weekday: number;
        };
        ComputedFields: never;
        Insert: {
          deal_id: string;
          ends_time: string;
          id?: string;
          starts_time: string;
          weekday: number;
        };
        Update: {
          deal_id?: string;
          ends_time?: string;
          id?: string;
          starts_time?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "deal_schedules_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "active_deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deal_schedules_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
        ];
      };
      deal_templates: {
        Row: {
          category_id: number | null;
          description: string | null;
          discount_type: Database["public"]["Enums"]["discount_type"];
          discount_value: number | null;
          id: string;
          is_active: boolean;
          min_group_size: number;
          sort_order: number;
          student_only: boolean;
          suggested_end: string | null;
          suggested_start: string | null;
          suggested_weekdays: number[];
          terms: string | null;
          tip: string | null;
          title: string;
        };
        ComputedFields: never;
        Insert: {
          category_id?: number | null;
          description?: string | null;
          discount_type?: Database["public"]["Enums"]["discount_type"];
          discount_value?: number | null;
          id?: string;
          is_active?: boolean;
          min_group_size?: number;
          sort_order?: number;
          student_only?: boolean;
          suggested_end?: string | null;
          suggested_start?: string | null;
          suggested_weekdays?: number[];
          terms?: string | null;
          tip?: string | null;
          title: string;
        };
        Update: {
          category_id?: number | null;
          description?: string | null;
          discount_type?: Database["public"]["Enums"]["discount_type"];
          discount_value?: number | null;
          id?: string;
          is_active?: boolean;
          min_group_size?: number;
          sort_order?: number;
          student_only?: boolean;
          suggested_end?: string | null;
          suggested_start?: string | null;
          suggested_weekdays?: number[];
          terms?: string | null;
          tip?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deal_templates_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      deals: {
        Row: {
          business_id: string;
          created_at: string;
          description: string | null;
          discount_type: Database["public"]["Enums"]["discount_type"];
          discount_value: number | null;
          ends_at: string | null;
          flash_radius_m: number | null;
          id: string;
          image_url: string | null;
          is_flash: boolean;
          max_per_user: number;
          max_redemptions: number | null;
          min_group_size: number;
          promo_code: string | null;
          redeem_method: Database["public"]["Enums"]["redeem_method"];
          starts_at: string;
          status: Database["public"]["Enums"]["content_status"];
          student_only: boolean;
          template_id: string | null;
          terms: string | null;
          title: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          description?: string | null;
          discount_type?: Database["public"]["Enums"]["discount_type"];
          discount_value?: number | null;
          ends_at?: string | null;
          flash_radius_m?: number | null;
          id?: string;
          image_url?: string | null;
          is_flash?: boolean;
          max_per_user?: number;
          max_redemptions?: number | null;
          min_group_size?: number;
          promo_code?: string | null;
          redeem_method?: Database["public"]["Enums"]["redeem_method"];
          starts_at?: string;
          status?: Database["public"]["Enums"]["content_status"];
          student_only?: boolean;
          template_id?: string | null;
          terms?: string | null;
          title: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          description?: string | null;
          discount_type?: Database["public"]["Enums"]["discount_type"];
          discount_value?: number | null;
          ends_at?: string | null;
          flash_radius_m?: number | null;
          id?: string;
          image_url?: string | null;
          is_flash?: boolean;
          max_per_user?: number;
          max_redemptions?: number | null;
          min_group_size?: number;
          promo_code?: string | null;
          redeem_method?: Database["public"]["Enums"]["redeem_method"];
          starts_at?: string;
          status?: Database["public"]["Enums"]["content_status"];
          student_only?: boolean;
          template_id?: string | null;
          terms?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deals_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deals_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "deal_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          business_id: string;
          created_at: string;
          description: string | null;
          ends_at: string | null;
          id: string;
          image_url: string | null;
          lat: number | null;
          lng: number | null;
          location_text: string | null;
          price_text: string | null;
          starts_at: string;
          status: Database["public"]["Enums"]["content_status"];
          ticket_url: string | null;
          title: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          description?: string | null;
          ends_at?: string | null;
          id?: string;
          image_url?: string | null;
          lat?: number | null;
          lng?: number | null;
          location_text?: string | null;
          price_text?: string | null;
          starts_at: string;
          status?: Database["public"]["Enums"]["content_status"];
          ticket_url?: string | null;
          title: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          description?: string | null;
          ends_at?: string | null;
          id?: string;
          image_url?: string | null;
          lat?: number | null;
          lng?: number | null;
          location_text?: string | null;
          price_text?: string | null;
          starts_at?: string;
          status?: Database["public"]["Enums"]["content_status"];
          ticket_url?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      favorites: {
        Row: {
          created_at: string;
          target_id: string;
          target_type: Database["public"]["Enums"]["favorite_target"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          target_id: string;
          target_type: Database["public"]["Enums"]["favorite_target"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          target_id?: string;
          target_type?: Database["public"]["Enums"]["favorite_target"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favorites_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      follows: {
        Row: {
          business_id: string;
          created_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follows_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follows_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follows_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      friendships: {
        Row: {
          addressee_id: string;
          created_at: string;
          id: string;
          requester_id: string;
          responded_at: string | null;
          status: Database["public"]["Enums"]["friendship_status"];
        };
        ComputedFields: never;
        Insert: {
          addressee_id: string;
          created_at?: string;
          id?: string;
          requester_id: string;
          responded_at?: string | null;
          status?: Database["public"]["Enums"]["friendship_status"];
        };
        Update: {
          addressee_id?: string;
          created_at?: string;
          id?: string;
          requester_id?: string;
          responded_at?: string | null;
          status?: Database["public"]["Enums"]["friendship_status"];
        };
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey";
            columns: ["addressee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "friendships_addressee_id_fkey";
            columns: ["addressee_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "friendships_requester_id_fkey";
            columns: ["requester_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "friendships_requester_id_fkey";
            columns: ["requester_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      institutions: {
        Row: {
          city: string | null;
          email_domains: string[];
          id: number;
          is_active: boolean;
          name: string;
          short_name: string | null;
        };
        ComputedFields: never;
        Insert: {
          city?: string | null;
          email_domains: string[];
          id?: number;
          is_active?: boolean;
          name: string;
          short_name?: string | null;
        };
        Update: {
          city?: string | null;
          email_domains?: string[];
          id?: number;
          is_active?: boolean;
          name?: string;
          short_name?: string | null;
        };
        Relationships: [];
      };
      loyalty_cards: {
        Row: {
          completed_at: string | null;
          created_at: string;
          id: string;
          program_id: string;
          reward_claimed_at: string | null;
          stamps: number;
          token: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          program_id: string;
          reward_claimed_at?: string | null;
          stamps?: number;
          token?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          program_id?: string;
          reward_claimed_at?: string | null;
          stamps?: number;
          token?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "loyalty_cards_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "loyalty_programs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loyalty_cards_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loyalty_cards_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      loyalty_programs: {
        Row: {
          business_id: string;
          created_at: string;
          description: string | null;
          id: string;
          reward_text: string;
          stamp_cooldown_minutes: number;
          stamps_required: number;
          status: Database["public"]["Enums"]["content_status"];
          title: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          reward_text: string;
          stamp_cooldown_minutes?: number;
          stamps_required?: number;
          status?: Database["public"]["Enums"]["content_status"];
          title: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          reward_text?: string;
          stamp_cooldown_minutes?: number;
          stamps_required?: number;
          status?: Database["public"]["Enums"]["content_status"];
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "loyalty_programs_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      loyalty_stamps: {
        Row: {
          card_id: string;
          created_at: string;
          id: string;
          stamped_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          card_id: string;
          created_at?: string;
          id?: string;
          stamped_by?: string | null;
        };
        Update: {
          card_id?: string;
          created_at?: string;
          id?: string;
          stamped_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "loyalty_stamps_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: false;
            referencedRelation: "loyalty_cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loyalty_stamps_stamped_by_fkey";
            columns: ["stamped_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loyalty_stamps_stamped_by_fkey";
            columns: ["stamped_by"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      neighborhoods: {
        Row: {
          city: string;
          id: number;
          lat: number | null;
          lng: number | null;
          name: string;
          slug: string;
        };
        ComputedFields: never;
        Insert: {
          city: string;
          id?: number;
          lat?: number | null;
          lng?: number | null;
          name: string;
          slug: string;
        };
        Update: {
          city?: string;
          id?: number;
          lat?: number | null;
          lng?: number | null;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      news_posts: {
        Row: {
          body: string | null;
          business_id: string;
          id: string;
          image_url: string | null;
          published_at: string;
          status: Database["public"]["Enums"]["content_status"];
          title: string;
        };
        ComputedFields: never;
        Insert: {
          body?: string | null;
          business_id: string;
          id?: string;
          image_url?: string | null;
          published_at?: string;
          status?: Database["public"]["Enums"]["content_status"];
          title: string;
        };
        Update: {
          body?: string | null;
          business_id?: string;
          id?: string;
          image_url?: string | null;
          published_at?: string;
          status?: Database["public"]["Enums"]["content_status"];
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "news_posts_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_preferences: {
        Row: {
          category_ids: number[];
          flash_radius_m: number;
          notify_lat: number | null;
          notify_lng: number | null;
          pref_deals: boolean;
          pref_events: boolean;
          pref_flash_deals: boolean;
          pref_friends: boolean;
          pref_news: boolean;
          push_enabled: boolean;
          quiet_end: string;
          quiet_start: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          category_ids?: number[];
          flash_radius_m?: number;
          notify_lat?: number | null;
          notify_lng?: number | null;
          pref_deals?: boolean;
          pref_events?: boolean;
          pref_flash_deals?: boolean;
          pref_friends?: boolean;
          pref_news?: boolean;
          push_enabled?: boolean;
          quiet_end?: string;
          quiet_start?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category_ids?: number[];
          flash_radius_m?: number;
          notify_lat?: number | null;
          notify_lng?: number | null;
          pref_deals?: boolean;
          pref_events?: boolean;
          pref_flash_deals?: boolean;
          pref_friends?: boolean;
          pref_news?: boolean;
          push_enabled?: boolean;
          quiet_end?: string;
          quiet_start?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          data: NonNullable<Json>;
          id: string;
          read_at: string | null;
          target_id: string | null;
          target_type: string | null;
          title: string;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          body?: string | null;
          created_at?: string;
          data?: NonNullable<Json>;
          id?: string;
          read_at?: string | null;
          target_id?: string | null;
          target_type?: string | null;
          title: string;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          data?: NonNullable<Json>;
          id?: string;
          read_at?: string | null;
          target_id?: string | null;
          target_type?: string | null;
          title?: string;
          type?: Database["public"]["Enums"]["notification_type"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      opening_hours: {
        Row: {
          business_id: string;
          closes_at: string | null;
          id: string;
          is_closed: boolean;
          opens_at: string | null;
          weekday: number;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          closes_at?: string | null;
          id?: string;
          is_closed?: boolean;
          opens_at?: string | null;
          weekday: number;
        };
        Update: {
          business_id?: string;
          closes_at?: string | null;
          id?: string;
          is_closed?: boolean;
          opens_at?: string | null;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "opening_hours_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      point_ledger: {
        Row: {
          created_at: string;
          id: number;
          points: number;
          reason: string;
          ref_id: string | null;
          ref_type: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: never;
          points: number;
          reason: string;
          ref_id?: string | null;
          ref_type?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: never;
          points?: number;
          reason?: string;
          ref_id?: string | null;
          ref_type?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "point_ledger_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "point_ledger_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          birth_year: number | null;
          created_at: string;
          display_name: string | null;
          friend_code: string | null;
          home_city: string | null;
          id: string;
          interests: string[] | null;
          role: Database["public"]["Enums"]["user_role"];
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          birth_year?: number | null;
          created_at?: string;
          display_name?: string | null;
          friend_code?: string | null;
          home_city?: string | null;
          id: string;
          interests?: string[] | null;
          role?: Database["public"]["Enums"]["user_role"];
        };
        Update: {
          avatar_url?: string | null;
          birth_year?: number | null;
          created_at?: string;
          display_name?: string | null;
          friend_code?: string | null;
          home_city?: string | null;
          id?: string;
          interests?: string[] | null;
          role?: Database["public"]["Enums"]["user_role"];
        };
        Relationships: [];
      };
      push_tokens: {
        Row: {
          created_at: string;
          id: string;
          last_seen_at: string;
          platform: string;
          token: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          last_seen_at?: string;
          platform: string;
          token: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_seen_at?: string;
          platform?: string;
          token?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "push_tokens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      referrals: {
        Row: {
          created_at: string;
          id: string;
          referred_business_id: string | null;
          referred_user_id: string | null;
          referrer_id: string;
          rewarded_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          referred_business_id?: string | null;
          referred_user_id?: string | null;
          referrer_id: string;
          rewarded_at?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          referred_business_id?: string | null;
          referred_user_id?: string | null;
          referrer_id?: string;
          rewarded_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "referrals_referred_business_id_fkey";
            columns: ["referred_business_id"];
            isOneToOne: true;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "referrals_referred_user_id_fkey";
            columns: ["referred_user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "referrals_referred_user_id_fkey";
            columns: ["referred_user_id"];
            isOneToOne: true;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey";
            columns: ["referrer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey";
            columns: ["referrer_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          created_at: string;
          details: string | null;
          handled_at: string | null;
          handled_by: string | null;
          handled_note: string | null;
          id: string;
          reason: string;
          reporter_id: string;
          status: Database["public"]["Enums"]["report_status"];
          target_id: string;
          target_type: Database["public"]["Enums"]["report_target"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          details?: string | null;
          handled_at?: string | null;
          handled_by?: string | null;
          handled_note?: string | null;
          id?: string;
          reason: string;
          reporter_id: string;
          status?: Database["public"]["Enums"]["report_status"];
          target_id: string;
          target_type: Database["public"]["Enums"]["report_target"];
        };
        Update: {
          created_at?: string;
          details?: string | null;
          handled_at?: string | null;
          handled_by?: string | null;
          handled_note?: string | null;
          id?: string;
          reason?: string;
          reporter_id?: string;
          status?: Database["public"]["Enums"]["report_status"];
          target_id?: string;
          target_type?: Database["public"]["Enums"]["report_target"];
        };
        Relationships: [
          {
            foreignKeyName: "reports_handled_by_fkey";
            columns: ["handled_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_handled_by_fkey";
            columns: ["handled_by"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          business_id: string;
          business_reply: string | null;
          comment: string | null;
          created_at: string;
          id: string;
          rating: number;
          replied_at: string | null;
          status: Database["public"]["Enums"]["review_status"];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          business_reply?: string | null;
          comment?: string | null;
          created_at?: string;
          id?: string;
          rating: number;
          replied_at?: string | null;
          status?: Database["public"]["Enums"]["review_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          business_id?: string;
          business_reply?: string | null;
          comment?: string | null;
          created_at?: string;
          id?: string;
          rating?: number;
          replied_at?: string | null;
          status?: Database["public"]["Enums"]["review_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      shared_deals: {
        Row: {
          created_at: string;
          deal_id: string;
          from_user_id: string;
          id: string;
          message: string | null;
          rewarded_at: string | null;
          seen_at: string | null;
          to_user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          deal_id: string;
          from_user_id: string;
          id?: string;
          message?: string | null;
          rewarded_at?: string | null;
          seen_at?: string | null;
          to_user_id: string;
        };
        Update: {
          created_at?: string;
          deal_id?: string;
          from_user_id?: string;
          id?: string;
          message?: string | null;
          rewarded_at?: string | null;
          seen_at?: string | null;
          to_user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shared_deals_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "active_deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shared_deals_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shared_deals_from_user_id_fkey";
            columns: ["from_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shared_deals_from_user_id_fkey";
            columns: ["from_user_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shared_deals_to_user_id_fkey";
            columns: ["to_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shared_deals_to_user_id_fkey";
            columns: ["to_user_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      student_verifications: {
        Row: {
          created_at: string;
          edu_email: string;
          expires_at: string | null;
          institution_id: number;
          status: Database["public"]["Enums"]["verification_status"];
          token_expires_at: string | null;
          user_id: string;
          verification_token: string | null;
          verified_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          edu_email: string;
          expires_at?: string | null;
          institution_id: number;
          status?: Database["public"]["Enums"]["verification_status"];
          token_expires_at?: string | null;
          user_id: string;
          verification_token?: string | null;
          verified_at?: string | null;
        };
        Update: {
          created_at?: string;
          edu_email?: string;
          expires_at?: string | null;
          institution_id?: number;
          status?: Database["public"]["Enums"]["verification_status"];
          token_expires_at?: string | null;
          user_id?: string;
          verification_token?: string | null;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "student_verifications_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_verifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_verifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          business_id: string;
          current_period_end: string | null;
          id: string;
          plan: Database["public"]["Enums"]["plan_type"];
          status: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          current_period_end?: string | null;
          id?: string;
          plan?: Database["public"]["Enums"]["plan_type"];
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
        };
        Update: {
          business_id?: string;
          current_period_end?: string | null;
          id?: string;
          plan?: Database["public"]["Enums"]["plan_type"];
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: true;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      tags: {
        Row: {
          icon: string | null;
          id: number;
          name: string;
          slug: string;
        };
        ComputedFields: never;
        Insert: {
          icon?: string | null;
          id?: number;
          name: string;
          slug: string;
        };
        Update: {
          icon?: string | null;
          id?: number;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      user_badges: {
        Row: {
          badge_id: number;
          earned_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          badge_id: number;
          earned_at?: string;
          user_id: string;
        };
        Update: {
          badge_id?: number;
          earned_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey";
            columns: ["badge_id"];
            isOneToOne: false;
            referencedRelation: "badges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_badges_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_badges_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      active_deals: {
        Row: {
          business_id: string;
          created_at: string;
          description: string | null;
          discount_type: Database["public"]["Enums"]["discount_type"];
          discount_value: number | null;
          ends_at: string | null;
          flash_radius_m: number | null;
          id: string;
          image_url: string | null;
          is_flash: boolean;
          max_per_user: number;
          max_redemptions: number | null;
          min_group_size: number;
          promo_code: string | null;
          redeem_method: Database["public"]["Enums"]["redeem_method"];
          starts_at: string;
          status: Database["public"]["Enums"]["content_status"];
          student_only: boolean;
          template_id: string | null;
          terms: string | null;
          title: string;
          valid_now: boolean | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "deals_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deals_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "deal_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      business_ratings: {
        Row: {
          avg_rating: number | null;
          business_id: string;
          review_count: number | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      my_points: {
        Row: {
          total: number | null;
          user_id: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "point_ledger_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "point_ledger_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      public_profiles: {
        Row: {
          avatar_url: string | null;
          display_name: string | null;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          display_name?: string | null;
          id?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          display_name?: string | null;
          id?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      add_stamp: {
        Args: { p_card_token: string };
        Returns: {
          completed_at: string | null;
          created_at: string;
          id: string;
          program_id: string;
          reward_claimed_at: string | null;
          stamps: number;
          token: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "loyalty_cards";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      apply_business_referral: {
        Args: { p_business_id: string; p_code: string };
        Returns: {
          created_at: string;
          id: string;
          referred_business_id: string | null;
          referred_user_id: string | null;
          referrer_id: string;
          rewarded_at: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "referrals";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      apply_referral: {
        Args: { p_code: string };
        Returns: {
          created_at: string;
          id: string;
          referred_business_id: string | null;
          referred_user_id: string | null;
          referrer_id: string;
          rewarded_at: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "referrals";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      approve_business_claim: {
        Args: { p_claim_id: string; p_note?: string };
        Returns: {
          business_id: string;
          claimant_id: string;
          created_at: string;
          evidence_url: string | null;
          id: string;
          message: string | null;
          org_number: string | null;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["claim_status"];
        };
        SetofOptions: {
          from: "*";
          to: "business_claims";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      are_friends: { Args: { a: string; b: string }; Returns: boolean };
      award_badges: { Args: { p_user: string }; Returns: undefined };
      award_points: {
        Args: {
          p_points: number;
          p_reason: string;
          p_ref_id?: string;
          p_ref_type?: string;
          p_user: string;
        };
        Returns: undefined;
      };
      business_customer_stats: {
        Args: { p_business_id: string; p_from?: string; p_to?: string };
        Returns: {
          avg_rating: number;
          followers: number;
          loyalty_cards_completed: number;
          new_customers: number;
          profile_views: number;
          redemptions: number;
          returning_customers: number;
          review_count: number;
          stamps_given: number;
          unique_customers: number;
        }[];
      };
      business_daily_stats: {
        Args: { p_business_id: string; p_days?: number };
        Returns: {
          day: string;
          redeemed: number;
          views: number;
        }[];
      };
      business_deal_stats: {
        Args: { p_business_id: string; p_from?: string; p_to?: string };
        Returns: {
          clicks: number;
          conversion_rate: number;
          deal_id: string;
          favorites: number;
          issued: number;
          redeemed: number;
          title: string;
          views: number;
        }[];
      };
      claim_deal: {
        Args: { p_deal_id: string; p_shared_deal_id?: string };
        Returns: {
          deal_id: string;
          expires_at: string;
          id: string;
          is_first_time: boolean | null;
          issued_at: string;
          party_size: number;
          redeemed_at: string | null;
          shared_deal_id: string | null;
          status: Database["public"]["Enums"]["redemption_state"];
          token: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "deal_redemptions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      claim_loyalty_reward: {
        Args: { p_card_token: string };
        Returns: {
          completed_at: string | null;
          created_at: string;
          id: string;
          program_id: string;
          reward_claimed_at: string | null;
          stamps: number;
          token: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "loyalty_cards";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      deal_is_valid_now: {
        Args: { p_at?: string; p_deal_id: string };
        Returns: boolean;
      };
      distance_m: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number };
        Returns: number;
      };
      has_visited_business: {
        Args: { p_business_id: string };
        Returns: boolean;
      };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_business_member: { Args: { b_id: string }; Returns: boolean };
      is_business_member_of: {
        Args: { b_id: string; p_user: string };
        Returns: boolean;
      };
      is_business_owner: { Args: { b_id: string }; Returns: boolean };
      is_client_write: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_program_member: { Args: { p_program_id: string }; Returns: boolean };
      is_verified_student: { Args: { p_user?: string }; Returns: boolean };
      join_loyalty_program: {
        Args: { p_program_id: string };
        Returns: {
          completed_at: string | null;
          created_at: string;
          id: string;
          program_id: string;
          reward_claimed_at: string | null;
          stamps: number;
          token: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "loyalty_cards";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      nearby_flash_audience: {
        Args: { p_deal_id: string };
        Returns: {
          user_id: string;
        }[];
      };
      notification_allowed: {
        Args: {
          p_type: Database["public"]["Enums"]["notification_type"];
          p_user: string;
        };
        Returns: boolean;
      };
      push_notification: {
        Args: {
          p_body?: string;
          p_data?: Json;
          p_target_id?: string;
          p_target_type?: string;
          p_title: string;
          p_type: Database["public"]["Enums"]["notification_type"];
          p_user: string;
        };
        Returns: undefined;
      };
      redeem_deal: {
        Args: { p_party_size?: number; p_token: string };
        Returns: {
          deal_id: string;
          expires_at: string;
          id: string;
          is_first_time: boolean | null;
          issued_at: string;
          party_size: number;
          redeemed_at: string | null;
          shared_deal_id: string | null;
          status: Database["public"]["Enums"]["redemption_state"];
          token: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "deal_redemptions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      reject_business_claim: {
        Args: { p_claim_id: string; p_note?: string };
        Returns: {
          business_id: string;
          claimant_id: string;
          created_at: string;
          evidence_url: string | null;
          id: string;
          message: string | null;
          org_number: string | null;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["claim_status"];
        };
        SetofOptions: {
          from: "*";
          to: "business_claims";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      reply_to_review: {
        Args: { p_reply: string; p_review_id: string };
        Returns: {
          business_id: string;
          business_reply: string | null;
          comment: string | null;
          created_at: string;
          id: string;
          rating: number;
          replied_at: string | null;
          status: Database["public"]["Enums"]["review_status"];
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "reviews";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      request_student_verification: {
        Args: { p_edu_email: string };
        Returns: undefined;
      };
      respond_friend_request: {
        Args: { p_accept: boolean; p_friendship_id: string };
        Returns: {
          addressee_id: string;
          created_at: string;
          id: string;
          requester_id: string;
          responded_at: string | null;
          status: Database["public"]["Enums"]["friendship_status"];
        };
        SetofOptions: {
          from: "*";
          to: "friendships";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      run_maintenance: { Args: Record<PropertyKey, never>; Returns: undefined };
      send_friend_request: {
        Args: { p_friend_code: string };
        Returns: {
          addressee_id: string;
          created_at: string;
          id: string;
          requester_id: string;
          responded_at: string | null;
          status: Database["public"]["Enums"]["friendship_status"];
        };
        SetofOptions: {
          from: "*";
          to: "friendships";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      share_deal: {
        Args: { p_deal_id: string; p_message?: string; p_to_user: string };
        Returns: {
          created_at: string;
          deal_id: string;
          from_user_id: string;
          id: string;
          message: string | null;
          rewarded_at: string | null;
          seen_at: string | null;
          to_user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "shared_deals";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      verify_student: {
        Args: { p_token: string };
        Returns: {
          created_at: string;
          edu_email: string;
          expires_at: string | null;
          institution_id: number;
          status: Database["public"]["Enums"]["verification_status"];
          token_expires_at: string | null;
          user_id: string;
          verification_token: string | null;
          verified_at: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "student_verifications";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      analytics_event_type:
        "view" | "click" | "share" | "directions" | "call" | "website";
      analytics_target: "deal" | "event" | "business" | "news_post";
      business_status: "pending" | "approved" | "suspended";
      claim_status: "pending" | "approved" | "rejected";
      content_status: "draft" | "active" | "paused" | "expired";
      discount_type: "percent" | "amount" | "freebie" | "other";
      favorite_target: "deal" | "event" | "business";
      friendship_status: "pending" | "accepted";
      member_role: "owner" | "editor";
      notification_type:
        | "new_deal"
        | "flash_deal"
        | "new_event"
        | "new_news"
        | "friend_request"
        | "friend_accepted"
        | "deal_shared"
        | "badge"
        | "reward_ready"
        | "review_reply"
        | "system";
      plan_type: "basic" | "plus";
      redeem_method: "show_screen" | "code" | "qr";
      redemption_state: "issued" | "redeemed" | "expired";
      report_status: "open" | "dismissed" | "actioned";
      report_target:
        "business" | "deal" | "event" | "news_post" | "review" | "user";
      review_status: "published" | "hidden";
      user_role: "user" | "business" | "admin";
      verification_status: "pending" | "verified" | "expired";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      analytics_event_type: [
        "view",
        "click",
        "share",
        "directions",
        "call",
        "website",
      ],
      analytics_target: ["deal", "event", "business", "news_post"],
      business_status: ["pending", "approved", "suspended"],
      claim_status: ["pending", "approved", "rejected"],
      content_status: ["draft", "active", "paused", "expired"],
      discount_type: ["percent", "amount", "freebie", "other"],
      favorite_target: ["deal", "event", "business"],
      friendship_status: ["pending", "accepted"],
      member_role: ["owner", "editor"],
      notification_type: [
        "new_deal",
        "flash_deal",
        "new_event",
        "new_news",
        "friend_request",
        "friend_accepted",
        "deal_shared",
        "badge",
        "reward_ready",
        "review_reply",
        "system",
      ],
      plan_type: ["basic", "plus"],
      redeem_method: ["show_screen", "code", "qr"],
      redemption_state: ["issued", "redeemed", "expired"],
      report_status: ["open", "dismissed", "actioned"],
      report_target: [
        "business",
        "deal",
        "event",
        "news_post",
        "review",
        "user",
      ],
      review_status: ["published", "hidden"],
      user_role: ["user", "business", "admin"],
      verification_status: ["pending", "verified", "expired"],
    },
  },
} as const;
