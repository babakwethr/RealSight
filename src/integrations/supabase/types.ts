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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          admin_notes: string | null
          budget_range: string | null
          country: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          investor_type: string | null
          notes: string | null
          phone: string | null
          preferred_language: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          budget_range?: string | null
          country?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          investor_type?: string | null
          notes?: string | null
          phone?: string | null
          preferred_language?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          budget_range?: string | null
          country?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          investor_type?: string | null
          notes?: string | null
          phone?: string | null
          preferred_language?: string | null
          status?: string
        }
        Relationships: []
      }
      area_market_index_series: {
        Row: {
          area_id: string
          created_at: string | null
          id: string
          index_value: number | null
          month: string
          tx_volume: number | null
          yoy_growth: number | null
        }
        Insert: {
          area_id: string
          created_at?: string | null
          id?: string
          index_value?: number | null
          month: string
          tx_volume?: number | null
          yoy_growth?: number | null
        }
        Update: {
          area_id?: string
          created_at?: string | null
          id?: string
          index_value?: number | null
          month?: string
          tx_volume?: number | null
          yoy_growth?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "area_market_index_series_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "dld_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      area_price_index_monthly: {
        Row: {
          area_id: string
          avg_price_per_sqft: number | null
          created_at: string | null
          id: string
          median_price_per_sqft: number | null
          month: string
          tx_volume: number | null
          yoy_growth: number | null
        }
        Insert: {
          area_id: string
          avg_price_per_sqft?: number | null
          created_at?: string | null
          id?: string
          median_price_per_sqft?: number | null
          month: string
          tx_volume?: number | null
          yoy_growth?: number | null
        }
        Update: {
          area_id?: string
          avg_price_per_sqft?: number | null
          created_at?: string | null
          id?: string
          median_price_per_sqft?: number | null
          month?: string
          tx_volume?: number | null
          yoy_growth?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "area_price_index_monthly_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "dld_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          investor_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          investor_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          investor_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_threads_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_projects: {
        Row: {
          amenities: string[] | null
          city: string
          completion_date: string | null
          construction_status: string | null
          coordinates: Json | null
          created_at: string
          description: string | null
          developer: string
          district: string
          id: string
          key_highlights: string[] | null
          media: Json | null
          name: string
          payment_plan: Json | null
          property_category: string
          sale_status: string | null
          starting_price: number | null
          tenant_id: string | null
          unit_sizes: Json | null
          updated_at: string
        }
        Insert: {
          amenities?: string[] | null
          city: string
          completion_date?: string | null
          construction_status?: string | null
          coordinates?: Json | null
          created_at?: string
          description?: string | null
          developer: string
          district: string
          id?: string
          key_highlights?: string[] | null
          media?: Json | null
          name: string
          payment_plan?: Json | null
          property_category: string
          sale_status?: string | null
          starting_price?: number | null
          tenant_id?: string | null
          unit_sizes?: Json | null
          updated_at?: string
        }
        Update: {
          amenities?: string[] | null
          city?: string
          completion_date?: string | null
          construction_status?: string | null
          coordinates?: Json | null
          created_at?: string
          description?: string | null
          developer?: string
          district?: string
          id?: string
          key_highlights?: string[] | null
          media?: Json | null
          name?: string
          payment_plan?: Json | null
          property_category?: string
          sale_status?: string | null
          starting_price?: number | null
          tenant_id?: string | null
          unit_sizes?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dld_areas: {
        Row: {
          avg_price_per_sqft_12m_ago: number
          avg_price_per_sqft_current: number
          city: string | null
          created_at: string
          demand_score: number
          id: string
          name: string
          name_normalized: string | null
          rental_yield_avg: number
          supply_pipeline_units: number
          transaction_volume_30d: number
          updated_at: string
        }
        Insert: {
          avg_price_per_sqft_12m_ago: number
          avg_price_per_sqft_current: number
          city?: string | null
          created_at?: string
          demand_score: number
          id?: string
          name: string
          name_normalized?: string | null
          rental_yield_avg: number
          supply_pipeline_units?: number
          transaction_volume_30d?: number
          updated_at?: string
        }
        Update: {
          avg_price_per_sqft_12m_ago?: number
          avg_price_per_sqft_current?: number
          city?: string | null
          created_at?: string
          demand_score?: number
          id?: string
          name?: string
          name_normalized?: string | null
          rental_yield_avg?: number
          supply_pipeline_units?: number
          transaction_volume_30d?: number
          updated_at?: string
        }
        Relationships: []
      }
      dld_developers: {
        Row: {
          avg_delay_months: number
          created_at: string
          id: string
          license_number: string
          name: string
          name_normalized: string | null
          reliability_score: number
          total_projects_completed: number
          total_projects_delayed: number
        }
        Insert: {
          avg_delay_months?: number
          created_at?: string
          id?: string
          license_number: string
          name: string
          name_normalized?: string | null
          reliability_score: number
          total_projects_completed?: number
          total_projects_delayed?: number
        }
        Update: {
          avg_delay_months?: number
          created_at?: string
          id?: string
          license_number?: string
          name?: string
          name_normalized?: string | null
          reliability_score?: number
          total_projects_completed?: number
          total_projects_delayed?: number
        }
        Relationships: []
      }
      dld_transactions: {
        Row: {
          area_id: string
          buyer_nationality: string | null
          created_at: string
          developer_id: string | null
          id: string
          price: number
          price_per_sqft: number
          project_name: string | null
          property_type: string
          size_sqft: number
          status: string
          transaction_date: string
          transaction_number: string
          transaction_type: string
        }
        Insert: {
          area_id: string
          buyer_nationality?: string | null
          created_at?: string
          developer_id?: string | null
          id?: string
          price: number
          price_per_sqft: number
          project_name?: string | null
          property_type: string
          size_sqft: number
          status: string
          transaction_date: string
          transaction_number: string
          transaction_type: string
        }
        Update: {
          area_id?: string
          buyer_nationality?: string | null
          created_at?: string
          developer_id?: string | null
          id?: string
          price?: number
          price_per_sqft?: number
          project_name?: string | null
          property_type?: string
          size_sqft?: number
          status?: string
          transaction_date?: string
          transaction_number?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dld_transactions_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "dld_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dld_transactions_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "dld_developers"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          created_at: string
          file_url: string
          id: string
          investor_id: string
          project_id: string | null
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          file_url: string
          id?: string
          investor_id: string
          project_id?: string | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          file_url?: string
          id?: string
          investor_id?: string
          project_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      dubai_market_index_series: {
        Row: {
          created_at: string | null
          id: string
          index_value: number | null
          month: string
          tx_volume: number | null
          yoy_growth: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          index_value?: number | null
          month: string
          tx_volume?: number | null
          yoy_growth?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          index_value?: number | null
          month?: string
          tx_volume?: number | null
          yoy_growth?: number | null
        }
        Relationships: []
      }
      dubai_price_index_monthly: {
        Row: {
          avg_price_per_sqft: number | null
          created_at: string | null
          id: string
          median_price_per_sqft: number | null
          month: string
          tx_volume: number | null
          yoy_growth: number | null
        }
        Insert: {
          avg_price_per_sqft?: number | null
          created_at?: string | null
          id?: string
          median_price_per_sqft?: number | null
          month: string
          tx_volume?: number | null
          yoy_growth?: number | null
        }
        Update: {
          avg_price_per_sqft?: number | null
          created_at?: string | null
          id?: string
          median_price_per_sqft?: number | null
          month?: string
          tx_volume?: number | null
          yoy_growth?: number | null
        }
        Relationships: []
      }
      holdings: {
        Row: {
          area_id: string | null
          created_at: string
          current_value: number
          developer_id: string | null
          id: string
          invested_amount: number
          investor_id: string
          project_id: string
          property_type: string | null
          status: string
          unit_ref: string
          updated_at: string
        }
        Insert: {
          area_id?: string | null
          created_at?: string
          current_value: number
          developer_id?: string | null
          id?: string
          invested_amount: number
          investor_id: string
          project_id: string
          property_type?: string | null
          status?: string
          unit_ref: string
          updated_at?: string
        }
        Update: {
          area_id?: string | null
          created_at?: string
          current_value?: number
          developer_id?: string | null
          id?: string
          invested_amount?: number
          investor_id?: string
          project_id?: string
          property_type?: string | null
          status?: string
          unit_ref?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "holdings_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "dld_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holdings_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "dld_developers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holdings_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holdings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      investors: {
        Row: {
          country: string | null
          created_at: string
          email: string
          id: string
          invitation_sent_at: string | null
          name: string
          notes: string | null
          phone: string | null
          preferred_language: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          email: string
          id?: string
          invitation_sent_at?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          preferred_language?: string | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string
          id?: string
          invitation_sent_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          preferred_language?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_pick_items: {
        Row: {
          created_at: string
          id: string
          pick_id: string
          project_id: string
          project_source: string
          rank: number
          reason_1: string | null
          reason_2: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          pick_id: string
          project_id: string
          project_source: string
          rank?: number
          reason_1?: string | null
          reason_2?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          pick_id?: string
          project_id?: string
          project_source?: string
          rank?: number
          reason_1?: string | null
          reason_2?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_pick_items_pick_id_fkey"
            columns: ["pick_id"]
            isOneToOne: false
            referencedRelation: "monthly_picks"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_picks: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          month: string
          notes: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          month: string
          notes?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          month?: string
          notes?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_picks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          investor_id: string
          note: string | null
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          investor_id: string
          note?: string | null
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          investor_id?: string
          note?: string | null
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          preferred_language: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          preferred_language?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          preferred_language?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          developer: string
          id: string
          image_url: string | null
          location: string
          name: string
          starting_price: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          developer: string
          id?: string
          image_url?: string | null
          location: string
          name: string
          starting_price: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          developer?: string
          id?: string
          image_url?: string | null
          location?: string
          name?: string
          starting_price?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_inventory: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          project_id: string
          project_source: string
          tenant_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          project_id: string
          project_source?: string
          tenant_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          project_id?: string
          project_source?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_inventory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          branding_config: Json
          broker_name: string
          created_at: string
          custom_domain: string | null
          id: string
          stripe_customer_id: string | null
          subdomain: string
          subscription_tier: string
        }
        Insert: {
          branding_config?: Json
          broker_name: string
          created_at?: string
          custom_domain?: string | null
          id?: string
          stripe_customer_id?: string | null
          subdomain: string
          subscription_tier?: string
        }
        Update: {
          branding_config?: Json
          broker_name?: string
          created_at?: string
          custom_domain?: string | null
          id?: string
          stripe_customer_id?: string | null
          subdomain?: string
          subscription_tier?: string
        }
        Relationships: []
      }
      updates: {
        Row: {
          created_at: string
          id: string
          project_id: string
          summary: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          summary: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          summary?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_investor_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_of_tenant: { Args: { p_tenant_id: string }; Returns: boolean }
      needs_onboarding: { Args: { p_user_id: string }; Returns: boolean }
      rebuild_dld_indexes: { Args: never; Returns: undefined }
      save_onboarding_profile: {
        Args: {
          p_country?: string
          p_full_name: string
          p_phone: string
          p_preferred_language?: string
          p_tenant_id?: string
        }
        Returns: Json
      }
      seed_demo_data_for_investor: {
        Args: { p_investor_id: string }
        Returns: undefined
      }
      setup_advisor_platform: {
        Args: {
          p_brand_color?: string
          p_broker_name: string
          p_subdomain: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
