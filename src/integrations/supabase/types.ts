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
      credentials: {
        Row: {
          block_number: number | null
          created_at: string
          credential_id: string
          credential_type: Database["public"]["Enums"]["credential_type"]
          document_hash: string
          id: string
          ipfs_cid: string | null
          issued_at: string | null
          issuer_wallet: string
          revoked_at: string | null
          status: Database["public"]["Enums"]["credential_status"]
          transaction_hash: string | null
          updated_at: string
        }
        Insert: {
          block_number?: number | null
          created_at?: string
          credential_id: string
          credential_type: Database["public"]["Enums"]["credential_type"]
          document_hash: string
          id?: string
          ipfs_cid?: string | null
          issued_at?: string | null
          issuer_wallet: string
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["credential_status"]
          transaction_hash?: string | null
          updated_at?: string
        }
        Update: {
          block_number?: number | null
          created_at?: string
          credential_id?: string
          credential_type?: Database["public"]["Enums"]["credential_type"]
          document_hash?: string
          id?: string
          ipfs_cid?: string | null
          issued_at?: string | null
          issuer_wallet?: string
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["credential_status"]
          transaction_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credentials_issuer_wallet_fkey"
            columns: ["issuer_wallet"]
            isOneToOne: false
            referencedRelation: "issuers"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      document_pins: {
        Row: {
          created_at: string
          document_hash: string
          ipfs_cid: string
          pinned_by: string
          size_bytes: number
        }
        Insert: {
          created_at?: string
          document_hash: string
          ipfs_cid: string
          pinned_by: string
          size_bytes: number
        }
        Update: {
          created_at?: string
          document_hash?: string
          ipfs_cid?: string
          pinned_by?: string
          size_bytes?: number
        }
        Relationships: []
      }
      issuers: {
        Row: {
          authorization_status: Database["public"]["Enums"]["issuer_authorization"]
          created_at: string
          id: string
          issuer_name: string
          updated_at: string
          wallet_address: string
        }
        Insert: {
          authorization_status?: Database["public"]["Enums"]["issuer_authorization"]
          created_at?: string
          id?: string
          issuer_name: string
          updated_at?: string
          wallet_address: string
        }
        Update: {
          authorization_status?: Database["public"]["Enums"]["issuer_authorization"]
          created_at?: string
          id?: string
          issuer_name?: string
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          bucket: string
          hits: number
          window_start: string
        }
        Insert: {
          bucket: string
          hits?: number
          window_start: string
        }
        Update: {
          bucket?: string
          hits?: number
          window_start?: string
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          wallet_address: string | null
        }
        Insert: {
          created_at?: string
          id: string
          updated_at?: string
          wallet_address?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      verification_events: {
        Row: {
          created_at: string
          credential_id: string
          id: string
          result: Database["public"]["Enums"]["verification_result"]
          verification_type: Database["public"]["Enums"]["verification_type"]
        }
        Insert: {
          created_at?: string
          credential_id: string
          id?: string
          result: Database["public"]["Enums"]["verification_result"]
          verification_type: Database["public"]["Enums"]["verification_type"]
        }
        Update: {
          created_at?: string
          credential_id?: string
          id?: string
          result?: Database["public"]["Enums"]["verification_result"]
          verification_type?: Database["public"]["Enums"]["verification_type"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hit_rate_limit: {
        Args: { _bucket: string; _limit: number; _window_seconds: number }
        Returns: boolean
      }
      is_authorized_issuer: {
        Args: { _user_id: string; _wallet: string }
        Returns: boolean
      }
      record_verification: {
        Args: {
          _credential_id: string
          _type: Database["public"]["Enums"]["verification_type"]
        }
        Returns: Database["public"]["Enums"]["verification_result"]
      }
      verification_event_count: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "issuer" | "user"
      credential_status: "ACTIVE" | "REVOKED" | "PENDING" | "ERROR"
      credential_type:
        | "Academic"
        | "Internship"
        | "Course"
        | "Achievement"
        | "Project"
        | "Other"
      issuer_authorization:
        | "authorized"
        | "unauthorized"
        | "pending"
        | "suspended"
      verification_result:
        | "record_found"
        | "revoked"
        | "pending"
        | "error_state"
        | "not_found"
      verification_type: "credential_id" | "qr" | "document" | "public_link"
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
      app_role: ["admin", "issuer", "user"],
      credential_status: ["ACTIVE", "REVOKED", "PENDING", "ERROR"],
      credential_type: [
        "Academic",
        "Internship",
        "Course",
        "Achievement",
        "Project",
        "Other",
      ],
      issuer_authorization: [
        "authorized",
        "unauthorized",
        "pending",
        "suspended",
      ],
      verification_result: [
        "record_found",
        "revoked",
        "pending",
        "error_state",
        "not_found",
      ],
      verification_type: ["credential_id", "qr", "document", "public_link"],
    },
  },
} as const
