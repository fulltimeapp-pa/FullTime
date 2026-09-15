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
      call_up_players: {
        Row: {
          attended: boolean | null
          attended_at: string | null
          call_up_id: string
          created_at: string
          id: string
          player_id: string
          read_at: string | null
          reason: string | null
          remind_night_before_at: string | null
          remind_soon_at: string | null
          responded_at: string | null
          rpe: number | null
          rpe_at: string | null
          status: Database["public"]["Enums"]["call_up_response_status"]
          updated_at: string
          wellness_at: string | null
          wellness_energy: number | null
          wellness_mood: number | null
          wellness_sleep: number | null
          wellness_soreness: number | null
        }
        Insert: {
          attended?: boolean | null
          attended_at?: string | null
          call_up_id: string
          created_at?: string
          id?: string
          player_id: string
          read_at?: string | null
          reason?: string | null
          remind_night_before_at?: string | null
          remind_soon_at?: string | null
          responded_at?: string | null
          rpe?: number | null
          rpe_at?: string | null
          status?: Database["public"]["Enums"]["call_up_response_status"]
          updated_at?: string
          wellness_at?: string | null
          wellness_energy?: number | null
          wellness_mood?: number | null
          wellness_sleep?: number | null
          wellness_soreness?: number | null
        }
        Update: {
          attended?: boolean | null
          attended_at?: string | null
          call_up_id?: string
          created_at?: string
          id?: string
          player_id?: string
          read_at?: string | null
          reason?: string | null
          remind_night_before_at?: string | null
          remind_soon_at?: string | null
          responded_at?: string | null
          rpe?: number | null
          rpe_at?: string | null
          status?: Database["public"]["Enums"]["call_up_response_status"]
          updated_at?: string
          wellness_at?: string | null
          wellness_energy?: number | null
          wellness_mood?: number | null
          wellness_sleep?: number | null
          wellness_soreness?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "call_up_players_call_up_id_fkey"
            columns: ["call_up_id"]
            isOneToOne: false
            referencedRelation: "call_ups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_up_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      call_ups: {
        Row: {
          category_id: string
          club_id: string
          created_at: string
          created_by: string
          id: string
          kind: Database["public"]["Enums"]["call_up_kind"]
          note: string | null
          objetivo: string | null
          place: string
          rpe_enabled: boolean
          starts_at: string
          updated_at: string
          wellness_enabled: boolean
        }
        Insert: {
          category_id: string
          club_id: string
          created_at?: string
          created_by: string
          id?: string
          kind: Database["public"]["Enums"]["call_up_kind"]
          note?: string | null
          objetivo?: string | null
          place: string
          rpe_enabled?: boolean
          starts_at: string
          updated_at?: string
          wellness_enabled?: boolean
        }
        Update: {
          category_id?: string
          club_id?: string
          created_at?: string
          created_by?: string
          id?: string
          kind?: Database["public"]["Enums"]["call_up_kind"]
          note?: string | null
          objetivo?: string | null
          place?: string
          rpe_enabled?: boolean
          starts_at?: string
          updated_at?: string
          wellness_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "call_ups_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_ups_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          club_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_crm: {
        Row: {
          club_id: string
          notes: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          club_id: string
          notes?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          club_id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_crm_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_members: {
        Row: {
          club_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["club_role"]
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["club_role"]
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["club_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_payments: {
        Row: {
          amount: number | null
          club_id: string | null
          created_at: string
          created_by: string | null
          id: string
          method: string | null
          months: number
          note: string | null
          paid_at: string
        }
        Insert: {
          amount?: number | null
          club_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string | null
          months: number
          note?: string | null
          paid_at?: string
        }
        Update: {
          amount?: number | null
          club_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string | null
          months?: number
          note?: string | null
          paid_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_payments_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_subscription: {
        Row: {
          blocked: boolean
          club_id: string
          paid_until: string | null
          updated_at: string
        }
        Insert: {
          blocked?: boolean
          club_id: string
          paid_until?: string | null
          updated_at?: string
        }
        Update: {
          blocked?: boolean
          club_id?: string
          paid_until?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_subscription_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          created_at: string
          created_by: string
          id: string
          logo_path: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          logo_path?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          logo_path?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          birth_date: string | null
          category_id: string
          club_id: string
          created_at: string
          email: string
          full_name: string
          id: string
          invite_expires_at: string | null
          invite_token: string | null
          invited_at: string | null
          jersey_number: number | null
          phone: string | null
          photo_path: string | null
          position: Database["public"]["Enums"]["player_position"] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          birth_date?: string | null
          category_id: string
          club_id: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_at?: string | null
          jersey_number?: number | null
          phone?: string | null
          photo_path?: string | null
          position?: Database["public"]["Enums"]["player_position"] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          birth_date?: string | null
          category_id?: string
          club_id?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_at?: string | null
          jersey_number?: number | null
          phone?: string | null
          photo_path?: string | null
          position?: Database["public"]["Enums"]["player_position"] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      session_template_activities: {
        Row: {
          created_at: string
          duration_min: number | null
          id: string
          intensity: string | null
          name: string
          note: string | null
          part: string
          sort_order: number
          template_id: string
        }
        Insert: {
          created_at?: string
          duration_min?: number | null
          id?: string
          intensity?: string | null
          name: string
          note?: string | null
          part: string
          sort_order?: number
          template_id: string
        }
        Update: {
          created_at?: string
          duration_min?: number | null
          id?: string
          intensity?: string | null
          name?: string
          note?: string | null
          part?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_template_activities_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "session_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      session_templates: {
        Row: {
          club_id: string
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_templates_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          club_id: string
          created_at: string
          created_by: string
          email: string | null
          expires_at: string | null
          id: string
          role: Database["public"]["Enums"]["club_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          club_id: string
          created_at?: string
          created_by: string
          email?: string | null
          expires_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["club_role"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          club_id?: string
          created_at?: string
          created_by?: string
          email?: string | null
          expires_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["club_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invites_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      training_activities: {
        Row: {
          call_up_id: string
          created_at: string
          duration_min: number | null
          id: string
          intensity: string | null
          name: string
          note: string | null
          part: string
          sort_order: number
        }
        Insert: {
          call_up_id: string
          created_at?: string
          duration_min?: number | null
          id?: string
          intensity?: string | null
          name: string
          note?: string | null
          part: string
          sort_order?: number
        }
        Update: {
          call_up_id?: string
          created_at?: string
          duration_min?: number | null
          id?: string
          intensity?: string | null
          name?: string
          note?: string | null
          part?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_activities_call_up_id_fkey"
            columns: ["call_up_id"]
            isOneToOne: false
            referencedRelation: "call_ups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_player_invite: { Args: { _token: string }; Returns: Json }
      accept_staff_invite: { Args: { _token: string }; Returns: Json }
      add_player_to_club: {
        Args: {
          _category_id?: string
          _club_id: string
          _email: string
          _full_name: string
        }
        Returns: Json
      }
      club_attendance_stats: {
        Args: { _category_id?: string; _club_id: string; _since?: string }
        Returns: Json
      }
      club_detail: { Args: { _club_id: string }; Returns: Json }
      club_pending_players: { Args: { _club_id: string }; Returns: Json }
      create_my_club: { Args: { _name: string }; Returns: string }
      delete_club: { Args: { _club_id: string }; Returns: Json }
      get_player_invite: { Args: { _token: string }; Returns: Json }
      get_staff_invite: { Args: { _token: string }; Returns: Json }
      is_club_admin: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      is_club_member: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      is_club_staff: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      is_player_self: { Args: { _player_id: string }; Returns: boolean }
      mask_email: { Args: { _email: string }; Returns: string }
      platform_kpis: { Args: never; Returns: Json }
      platform_overview: { Args: never; Returns: Json }
      record_club_payment: {
        Args: {
          _amount: number
          _club_id: string
          _months: number
          _note: string
          _paid_at: string
        }
        Returns: Json
      }
      regenerate_player_invite: { Args: { _player_id: string }; Returns: Json }
      repair_my_club_membership: { Args: never; Returns: string }
      set_club_blocked: {
        Args: { _blocked: boolean; _club_id: string }
        Returns: Json
      }
    }
    Enums: {
      call_up_kind: "partido" | "entreno"
      call_up_response_status: "pending" | "going" | "declined"
      club_role: "owner" | "admin" | "coach" | "jugadora"
      player_position: "portera" | "defensa" | "mediocampista" | "delantera"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      call_up_kind: ["partido", "entreno"],
      call_up_response_status: ["pending", "going", "declined"],
      club_role: ["owner", "admin", "coach", "jugadora"],
      player_position: ["portera", "defensa", "mediocampista", "delantera"],
    },
  },
} as const
