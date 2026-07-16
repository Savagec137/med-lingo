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
      badges: {
        Row: {
          code: string
          created_at: string
          description: string
          icon: string
          id: string
          rarity: string
          threshold: number | null
          title: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          icon?: string
          id?: string
          rarity?: string
          threshold?: number | null
          title: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          rarity?: string
          threshold?: number | null
          title?: string
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          reference: string | null
          source: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          reference?: string | null
          source: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          reference?: string | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      lesson_attempts: {
        Row: {
          correct: number
          created_at: string
          id: string
          lesson_id: string
          stars: number
          total: number
          user_id: string
        }
        Insert: {
          correct: number
          created_at?: string
          id?: string
          lesson_id: string
          stars: number
          total: number
          user_id: string
        }
        Update: {
          correct?: number
          created_at?: string
          id?: string
          lesson_id?: string
          stars?: number
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      missions: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string
          icon: string
          id: string
          metric: string
          period: string
          target: number
          title: string
          xp_reward: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description: string
          icon?: string
          id?: string
          metric: string
          period?: string
          target: number
          title: string
          xp_reward?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          metric?: string
          period?: string
          target?: number
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      shop_items: {
        Row: {
          active: boolean
          asset_url: string | null
          code: string
          created_at: string
          description: string | null
          icon: string | null
          name: string
          premium_only: boolean
          price_coins: number
          price_gems: number
          rarity: string
          sort_order: number
          type: string
        }
        Insert: {
          active?: boolean
          asset_url?: string | null
          code: string
          created_at?: string
          description?: string | null
          icon?: string | null
          name: string
          premium_only?: boolean
          price_coins?: number
          price_gems?: number
          rarity?: string
          sort_order?: number
          type: string
        }
        Update: {
          active?: boolean
          asset_url?: string | null
          code?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          name?: string
          premium_only?: boolean
          price_coins?: number
          price_gems?: number
          rarity?: string
          sort_order?: number
          type?: string
        }
        Relationships: []
      }
      srs_cards: {
        Row: {
          due_at: string
          ease_factor: number
          id: string
          interval_days: number
          item_key: string
          lapses: number
          reps: number
          updated_at: string
          user_id: string
        }
        Insert: {
          due_at?: string
          ease_factor?: number
          id?: string
          interval_days?: number
          item_key: string
          lapses?: number
          reps?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          due_at?: string
          ease_factor?: number
          id?: string
          interval_days?: number
          item_key?: string
          lapses?: number
          reps?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_code: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_code: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_code?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_code_fkey"
            columns: ["badge_code"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["code"]
          },
        ]
      }
      user_inventory: {
        Row: {
          acquired_at: string
          equipped: boolean
          id: string
          item_code: string
          user_id: string
        }
        Insert: {
          acquired_at?: string
          equipped?: boolean
          id?: string
          item_code: string
          user_id: string
        }
        Update: {
          acquired_at?: string
          equipped?: boolean
          id?: string
          item_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_inventory_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["code"]
          },
        ]
      }
      user_missions: {
        Row: {
          completed: boolean
          completed_at: string | null
          id: string
          mission_code: string
          period_start: string
          progress: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          mission_code: string
          period_start: string
          progress?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          mission_code?: string
          period_start?: string
          progress?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_missions_mission_code_fkey"
            columns: ["mission_code"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["code"]
          },
        ]
      }
      user_progress: {
        Row: {
          completed_lessons: Json
          daily_goal_xp: number
          hearts: number
          hearts_updated_at: string
          last_study_date: string | null
          level: number
          streak: number
          updated_at: string
          user_id: string
          xp: number
          xp_today: number
          xp_today_date: string
        }
        Insert: {
          completed_lessons?: Json
          daily_goal_xp?: number
          hearts?: number
          hearts_updated_at?: string
          last_study_date?: string | null
          level?: number
          streak?: number
          updated_at?: string
          user_id: string
          xp?: number
          xp_today?: number
          xp_today_date?: string
        }
        Update: {
          completed_lessons?: Json
          daily_goal_xp?: number
          hearts?: number
          hearts_updated_at?: string
          last_study_date?: string | null
          level?: number
          streak?: number
          updated_at?: string
          user_id?: string
          xp?: number
          xp_today?: number
          xp_today_date?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          coins: number
          created_at: string
          gems: number
          updated_at: string
          user_id: string
        }
        Insert: {
          coins?: number
          created_at?: string
          gems?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          coins?: number
          created_at?: string
          gems?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      xp_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          lesson_id: string | null
          source: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          lesson_id?: string | null
          source: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          lesson_id?: string | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_coins: {
        Args: { _amount: number; _reference?: string; _source: string }
        Returns: number
      }
      purchase_item: { Args: { _item_code: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
