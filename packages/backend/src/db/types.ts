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
    Functions: {
      tre60_auth_context: {
        Args: Record<string, never>;
        Returns: Tre60AuthContextRow[];
      };
    };
  };
};
