export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      approvals: {
        Row: {
          approver_id: string
          comments: string | null
          created_at: string
          decision: string
          id: string
          proposal_id: string
          version_id: string
        }
        Insert: {
          approver_id: string
          comments?: string | null
          created_at?: string
          decision: string
          id?: string
          proposal_id: string
          version_id: string
        }
        Update: {
          approver_id?: string
          comments?: string | null
          created_at?: string
          decision?: string
          id?: string
          proposal_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "approvals_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "proposal_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_attempts: {
        Row: {
          created_at: string
          created_by: string
          error: string | null
          id: string
          idempotency_key: string
          proposal_id: string
          provider: string
          provider_message_id: string | null
          recipient: string
          status: string
          updated_at: string
          version_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          error?: string | null
          id?: string
          idempotency_key: string
          proposal_id: string
          provider: string
          provider_message_id?: string | null
          recipient: string
          status: string
          updated_at?: string
          version_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          error?: string | null
          id?: string
          idempotency_key?: string
          proposal_id?: string
          provider?: string
          provider_message_id?: string | null
          recipient?: string
          status?: string
          updated_at?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_attempts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "delivery_attempts_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_attempts_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "proposal_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_runs: {
        Row: {
          base_version_id: string | null
          created_at: string
          created_by: string
          error: string | null
          finished_at: string | null
          id: string
          input_tokens: number | null
          latency_ms: number | null
          material_usage: Json
          model: string
          operation: string
          output_tokens: number | null
          output_version_id: string | null
          proposal_id: string
          provider: string
          status: string
          target_section: string | null
        }
        Insert: {
          base_version_id?: string | null
          created_at?: string
          created_by: string
          error?: string | null
          finished_at?: string | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          material_usage?: Json
          model: string
          operation: string
          output_tokens?: number | null
          output_version_id?: string | null
          proposal_id: string
          provider: string
          status: string
          target_section?: string | null
        }
        Update: {
          base_version_id?: string | null
          created_at?: string
          created_by?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          material_usage?: Json
          model?: string
          operation?: string
          output_tokens?: number | null
          output_version_id?: string | null
          proposal_id?: string
          provider?: string
          status?: string
          target_section?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generation_runs_base_version_id_fkey"
            columns: ["base_version_id"]
            isOneToOne: false
            referencedRelation: "proposal_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "generation_runs_output_version_id_fkey"
            columns: ["output_version_id"]
            isOneToOne: false
            referencedRelation: "proposal_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_runs_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      proposal_versions: {
        Row: {
          change_type: string
          changed_sections: string[]
          clarification_flags: Json
          content_hash: string
          created_at: string
          created_by: string
          id: string
          pdf_error: string | null
          pdf_generated_at: string | null
          pdf_sha256: string | null
          pdf_status: string
          pdf_storage_path: string | null
          proposal_id: string
          revision_instruction: string | null
          snapshot: Json
          version_number: number
        }
        Insert: {
          change_type: string
          changed_sections?: string[]
          clarification_flags?: Json
          content_hash: string
          created_at?: string
          created_by: string
          id?: string
          pdf_error?: string | null
          pdf_generated_at?: string | null
          pdf_sha256?: string | null
          pdf_status?: string
          pdf_storage_path?: string | null
          proposal_id: string
          revision_instruction?: string | null
          snapshot: Json
          version_number: number
        }
        Update: {
          change_type?: string
          changed_sections?: string[]
          clarification_flags?: Json
          content_hash?: string
          created_at?: string
          created_by?: string
          id?: string
          pdf_error?: string | null
          pdf_generated_at?: string | null
          pdf_sha256?: string | null
          pdf_status?: string
          pdf_storage_path?: string | null
          proposal_id?: string
          revision_instruction?: string | null
          snapshot?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "proposal_versions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          approval_submitted_at: string | null
          approval_submitted_by: string | null
          client_email: string | null
          client_name: string
          client_needs_summary: string
          company_name: string
          created_at: string
          created_by: string
          current_version_id: string | null
          date_of_call: string | null
          estimated_pricing: string
          goals_and_objectives: string
          id: string
          project_scope: string
          proposed_timeline: string
          recommended_services: string
          salesperson_name: string
          status: string
          updated_at: string
        }
        Insert: {
          approval_submitted_at?: string | null
          approval_submitted_by?: string | null
          client_email?: string | null
          client_name?: string
          client_needs_summary?: string
          company_name?: string
          created_at?: string
          created_by: string
          current_version_id?: string | null
          date_of_call?: string | null
          estimated_pricing?: string
          goals_and_objectives?: string
          id?: string
          project_scope?: string
          proposed_timeline?: string
          recommended_services?: string
          salesperson_name?: string
          status?: string
          updated_at?: string
        }
        Update: {
          approval_submitted_at?: string | null
          approval_submitted_by?: string | null
          client_email?: string | null
          client_name?: string
          client_needs_summary?: string
          company_name?: string
          created_at?: string
          created_by?: string
          current_version_id?: string | null
          date_of_call?: string | null
          estimated_pricing?: string
          goals_and_objectives?: string
          id?: string
          project_scope?: string
          proposed_timeline?: string
          recommended_services?: string
          salesperson_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_approval_submitted_by_fkey"
            columns: ["approval_submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "proposals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "proposals_current_version_id_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "proposal_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      supporting_materials: {
        Row: {
          created_at: string
          created_by: string
          extracted_text: string | null
          extraction_status: string
          filename: string
          id: string
          mime_type: string
          proposal_id: string
          size_bytes: number
          storage_path: string
          warning: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          extracted_text?: string | null
          extraction_status: string
          filename: string
          id?: string
          mime_type: string
          proposal_id: string
          size_bytes: number
          storage_path: string
          warning?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          extracted_text?: string | null
          extraction_status?: string
          filename?: string
          id?: string
          mime_type?: string
          proposal_id?: string
          size_bytes?: number
          storage_path?: string
          warning?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supporting_materials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "supporting_materials_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approver_decided_proposal: {
        Args: { p_proposal_id: string }
        Returns: boolean
      }
      approver_decided_version: {
        Args: { p_version_id: string }
        Returns: boolean
      }
      delete_draft_proposal: {
        Args: { p_proposal_id: string }
        Returns: undefined
      }
      dismiss_clarification_flag: {
        Args: { p_proposal_id: string; p_version_id: string; p_flag_id: string }
        Returns: {
          change_type: string
          changed_sections: string[]
          clarification_flags: Json
          content_hash: string
          created_at: string
          created_by: string
          id: string
          pdf_error: string | null
          pdf_generated_at: string | null
          pdf_sha256: string | null
          pdf_status: string
          pdf_storage_path: string | null
          proposal_id: string
          revision_instruction: string | null
          snapshot: Json
          version_number: number
        }
        SetofOptions: {
          from: "*"
          to: "proposal_versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_proposal_version: {
        Args: {
          p_change_type: string
          p_changed_sections: string[]
          p_clarification_flags: Json
          p_content_hash: string
          p_expected_current_version_id: string
          p_next_status: string
          p_proposal_id: string
          p_revision_instruction: string
          p_snapshot: Json
        }
        Returns: {
          change_type: string
          changed_sections: string[]
          clarification_flags: Json
          content_hash: string
          created_at: string
          created_by: string
          id: string
          pdf_error: string | null
          pdf_generated_at: string | null
          pdf_sha256: string | null
          pdf_status: string
          pdf_storage_path: string | null
          proposal_id: string
          revision_instruction: string | null
          snapshot: Json
          version_number: number
        }
        SetofOptions: {
          from: "*"
          to: "proposal_versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      list_version_changes_for_approver: {
        Args: { p_proposal_id: string; p_since_version_number: number }
        Returns: {
          version_number: number
          change_type: string
          changed_sections: string[]
          created_at: string
        }[]
      }
      current_role_is: { Args: { target_role: string }; Returns: boolean }
      decide_proposal_approval: {
        Args: {
          p_comments: string
          p_decision: string
          p_proposal_id: string
          p_version_id: string
        }
        Returns: {
          approver_id: string
          comments: string | null
          created_at: string
          decision: string
          id: string
          proposal_id: string
          version_id: string
        }
        SetofOptions: {
          from: "*"
          to: "approvals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finalize_delivery_attempt: {
        Args: { p_attempt_id: string; p_provider_message_id: string }
        Returns: {
          created_at: string
          created_by: string
          error: string | null
          id: string
          idempotency_key: string
          proposal_id: string
          provider: string
          provider_message_id: string | null
          recipient: string
          status: string
          updated_at: string
          version_id: string
        }
        SetofOptions: {
          from: "*"
          to: "delivery_attempts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      prepare_delivery_attempt: {
        Args: {
          p_idempotency_key: string
          p_proposal_id: string
          p_provider: string
          p_recipient: string
          p_version_id: string
        }
        Returns: {
          created_at: string
          created_by: string
          error: string | null
          id: string
          idempotency_key: string
          proposal_id: string
          provider: string
          provider_message_id: string | null
          recipient: string
          status: string
          updated_at: string
          version_id: string
        }
        SetofOptions: {
          from: "*"
          to: "delivery_attempts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      proposal_is_pending_with_current_version: {
        Args: { p_proposal_id: string; p_version_id: string }
        Returns: boolean
      }
      proposal_owned_by_current_user: {
        Args: { p_proposal_id: string }
        Returns: boolean
      }
      record_delivery_problem: {
        Args: {
          p_attempt_id: string
          p_error: string
          p_provider_message_id: string
          p_status: string
        }
        Returns: {
          created_at: string
          created_by: string
          error: string | null
          id: string
          idempotency_key: string
          proposal_id: string
          provider: string
          provider_message_id: string | null
          recipient: string
          status: string
          updated_at: string
          version_id: string
        }
        SetofOptions: {
          from: "*"
          to: "delivery_attempts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_version_pdf_state: {
        Args: {
          p_error: string
          p_generated_at: string
          p_proposal_id: string
          p_sha256: string
          p_status: string
          p_storage_path: string
          p_version_id: string
        }
        Returns: {
          change_type: string
          changed_sections: string[]
          clarification_flags: Json
          content_hash: string
          created_at: string
          created_by: string
          id: string
          pdf_error: string | null
          pdf_generated_at: string | null
          pdf_sha256: string | null
          pdf_status: string
          pdf_storage_path: string | null
          proposal_id: string
          revision_instruction: string | null
          snapshot: Json
          version_number: number
        }
        SetofOptions: {
          from: "*"
          to: "proposal_versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_proposal_for_approval: {
        Args: { p_expected_current_version_id: string; p_proposal_id: string }
        Returns: {
          approval_submitted_at: string | null
          approval_submitted_by: string | null
          client_email: string | null
          client_name: string
          client_needs_summary: string
          company_name: string
          created_at: string
          created_by: string
          current_version_id: string | null
          date_of_call: string | null
          estimated_pricing: string
          goals_and_objectives: string
          id: string
          project_scope: string
          proposed_timeline: string
          recommended_services: string
          salesperson_name: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "proposals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_client_email: {
        Args: { p_client_email: string; p_proposal_id: string }
        Returns: {
          approval_submitted_at: string | null
          approval_submitted_by: string | null
          client_email: string | null
          client_name: string
          client_needs_summary: string
          company_name: string
          created_at: string
          created_by: string
          current_version_id: string | null
          date_of_call: string | null
          estimated_pricing: string
          goals_and_objectives: string
          id: string
          project_scope: string
          proposed_timeline: string
          recommended_services: string
          salesperson_name: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "proposals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_pre_generation_intake: {
        Args: {
          p_client_name: string
          p_client_needs_summary: string
          p_company_name: string
          p_date_of_call: string
          p_estimated_pricing: string
          p_goals_and_objectives: string
          p_project_scope: string
          p_proposal_id: string
          p_proposed_timeline: string
          p_recommended_services: string
          p_salesperson_name: string
        }
        Returns: {
          approval_submitted_at: string | null
          approval_submitted_by: string | null
          client_email: string | null
          client_name: string
          client_needs_summary: string
          company_name: string
          created_at: string
          created_by: string
          current_version_id: string | null
          date_of_call: string | null
          estimated_pricing: string
          goals_and_objectives: string
          id: string
          project_scope: string
          proposed_timeline: string
          recommended_services: string
          salesperson_name: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "proposals"
          isOneToOne: true
          isSetofReturn: false
        }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

