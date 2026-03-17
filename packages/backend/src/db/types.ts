export type Tre60Role = "admin" | "employee" | "customer";
export type Tre60UserStatus = "active" | "invited" | "disabled";

export type Tre60AuthContextRow = {
  user_id: string | null;
  role: Tre60Role | null;
  status: Tre60UserStatus | null;
  default_company_id: string | null;
  customer_id: string | null;
  redirect_url: string | null;
};

export type Database = {
  public: {
    Tables: {
      auth_handoffs: {
        Row: {
          id: string;
          user_id: string;
          target_app: string;
          role: Tre60Role;
          redirect_path: string;
          secret_hash: string;
          payload_ciphertext: string;
          payload_iv: string;
          payload_auth_tag: string;
          created_ip: string | null;
          created_user_agent_hash: string | null;
          created_at: string;
          expires_at: string;
          consumed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          target_app: string;
          role: Tre60Role;
          redirect_path?: string;
          secret_hash: string;
          payload_ciphertext: string;
          payload_iv: string;
          payload_auth_tag: string;
          created_ip?: string | null;
          created_user_agent_hash?: string | null;
          created_at?: string;
          expires_at: string;
          consumed_at?: string | null;
        };
        Update: {
          consumed_at?: string | null;
        };
      };
    };
    Functions: {
      tre60_auth_context: {
        Args: Record<string, never>;
        Returns: Tre60AuthContextRow[];
      };
    };
  };
};
