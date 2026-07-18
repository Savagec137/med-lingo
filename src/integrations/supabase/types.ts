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
      chest_openings: {
        Row: {
          chest_code: string
          id: string
          loot: Json
          opened_at: string
          source: string
          tier: string
          user_id: string
        }
        Insert: {
          chest_code: string
          id?: string
          loot: Json
          opened_at?: string
          source: string
          tier: string
          user_id: string
        }
        Update: {
          chest_code?: string
          id?: string
          loot?: Json
          opened_at?: string
          source?: string
          tier?: string
          user_id?: string
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
      currency_transactions: {
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
          currency: string
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
      daily_rewards: {
        Row: {
          claimed_at: string
          id: string
          reward_date: string
          rewards: Json
          streak_day: number
          user_id: string
        }
        Insert: {
          claimed_at?: string
          id?: string
          reward_date: string
          rewards: Json
          streak_day: number
          user_id: string
        }
        Update: {
          claimed_at?: string
          id?: string
          reward_date?: string
          rewards?: Json
          streak_day?: number
          user_id?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          acquired_at: string
          id: string
          item_code: string
          item_type: string
          metadata: Json
          quantity: number
          rarity: string
          updated_at: string
          user_id: string
        }
        Insert: {
          acquired_at?: string
          id?: string
          item_code: string
          item_type: string
          metadata?: Json
          quantity?: number
          rarity?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          acquired_at?: string
          id?: string
          item_code?: string
          item_type?: string
          metadata?: Json
          quantity?: number
          rarity?: string
          updated_at?: string
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
      loot_tables: {
        Row: {
          active: boolean
          code: string
          created_at: string
          entries: Json
          id: string
          tier: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          entries: Json
          id?: string
          tier: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          entries?: Json
          id?: string
          tier?: string
          updated_at?: string
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
      reward_history: {
        Row: {
          created_at: string
          id: string
          reference: string | null
          reward: Json
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reference?: string | null
          reward: Json
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reference?: string | null
          reward?: Json
          source?: string
          user_id?: string
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
          metadata: Json
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
          metadata?: Json
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
          metadata?: Json
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
      user_currency: {
        Row: {
          coins: number
          energy: number
          energy_max: number
          gems: number
          keys: number
          tickets: number
          updated_at: string
          user_id: string
        }
        Insert: {
          coins?: number
          energy?: number
          energy_max?: number
          gems?: number
          keys?: number
          tickets?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          coins?: number
          energy?: number
          energy_max?: number
          gems?: number
          keys?: number
          tickets?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          is_premium: boolean
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
          is_premium?: boolean
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
          is_premium?: boolean
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
          energy: number
          energy_max: number
          energy_updated_at: string
          gems: number
          keys: number
          last_compensation_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          coins?: number
          created_at?: string
          energy?: number
          energy_max?: number
          energy_updated_at?: string
          gems?: number
          keys?: number
          last_compensation_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          coins?: number
          created_at?: string
          energy?: number
          energy_max?: number
          energy_updated_at?: string
          gems?: number
          keys?: number
          last_compensation_at?: string | null
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
      award_gems: {
        Args: { _amount: number; _reference?: string; _source: string }
        Returns: number
      }
      award_keys: {
        Args: { _amount: number; _reference?: string; _source: string }
        Returns: number
      }
      claim_compensation_chest: { Args: never; Returns: Json }
      claim_daily_reward: { Args: never; Returns: Json }
      game_level_from_xp: { Args: { total_xp: number }; Returns: number }
      get_my_weekly_rank: {
        Args: never
        Returns: {
          rank: number
          total_players: number
          weekly_xp: number
        }[]
      }
      get_weekly_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          avatar_url: string
          display_name: string
          rank: number
          user_id: string
          weekly_xp: number
        }[]
      }
      grant_game_reward: {
        Args: { _reference?: string; _reward: Json; _source: string }
        Returns: Json
      }
      open_chest: { Args: { _source: string; _tier: string }; Returns: Json }
      open_game_chest: { Args: { _chest_code: string }; Returns: Json }
      purchase_game_item: { Args: { _item_code: string }; Returns: Json }
      purchase_item: { Args: { _item_code: string }; Returns: Json }
      regen_energy: { Args: never; Returns: number }
      spend_energy: {
        Args: { _amount: number; _reason: string }
        Returns: number
      }
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
