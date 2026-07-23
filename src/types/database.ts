export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type FinancialContext = "personal" | "professional";
export type AccountType =
  | "checking"
  | "savings"
  | "investment"
  | "credit_card"
  | "cash"
  | "other";
export type CategoryKind = "income" | "expense";
export type SupportedCurrency = "BRL" | "USD" | "EUR";
export type TransactionType = "income" | "expense";
export type TransactionStatus = "pending" | "completed";
export type TransferDirection = "outflow" | "inflow";

export type Profile = {
  id: string;
  full_name: string;
  preferred_currency: SupportedCurrency;
  created_at: string;
  updated_at: string;
};

export type Account = {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  context: FinancialContext;
  currency: SupportedCurrency;
  opening_balance_minor: number;
  opening_balance_date: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  kind: CategoryKind;
  context: FinancialContext;
  is_system: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  transaction_type: TransactionType;
  description: string;
  amount_minor: number;
  transaction_date: string;
  status: TransactionStatus;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Transfer = {
  id: string;
  user_id: string;
  source_account_id: string;
  destination_account_id: string;
  amount_minor: number;
  currency: SupportedCurrency;
  transaction_date: string;
  status: TransactionStatus;
  description: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TransferEntry = {
  id: string;
  transfer_id: string;
  user_id: string;
  account_id: string;
  direction: TransferDirection;
  amount_minor: number;
  currency: SupportedCurrency;
  transaction_date: string;
  status: TransactionStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AccountBalance = Account & {
  current_balance_minor: number;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          full_name?: string;
          preferred_currency?: SupportedCurrency;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string;
          preferred_currency?: SupportedCurrency;
          updated_at?: string;
        };
        Relationships: [];
      };
      accounts: {
        Row: Account;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: AccountType;
          context: FinancialContext;
          currency?: SupportedCurrency;
          opening_balance_minor?: number;
          opening_balance_date?: string;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Account, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      categories: {
        Row: Category;
        Insert: {
          id?: string;
          user_id: string;
          parent_id?: string | null;
          name: string;
          kind: CategoryKind;
          context: FinancialContext;
          is_system?: boolean;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<Category, "id" | "user_id" | "is_system" | "created_at">
        >;
        Relationships: [];
      };
      transactions: {
        Row: Transaction;
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          category_id: string;
          transaction_type: TransactionType;
          description: string;
          amount_minor: number;
          transaction_date: string;
          status?: TransactionStatus;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<Transaction, "id" | "user_id" | "created_at">
        >;
        Relationships: [];
      };
      transfers: {
        Row: Transfer;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      transfer_entries: {
        Row: TransferEntry;
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: {
      account_balances: {
        Row: AccountBalance;
        Relationships: [];
      };
    };
    Functions: {
      seed_default_categories: {
        Args: { target_user_id: string };
        Returns: undefined;
      };
      create_transfer: {
        Args: {
          source_account_id: string;
          destination_account_id: string;
          amount_minor: number;
          transaction_date: string;
          transfer_status: TransactionStatus;
          transfer_description?: string | null;
          transfer_notes?: string | null;
        };
        Returns: string;
      };
      update_transfer: {
        Args: {
          target_transfer_id: string;
          source_account_id: string;
          destination_account_id: string;
          amount_minor: number;
          transaction_date: string;
          transfer_status: TransactionStatus;
          transfer_description?: string | null;
          transfer_notes?: string | null;
        };
        Returns: boolean;
      };
      set_transfer_active: {
        Args: {
          target_transfer_id: string;
          active: boolean;
        };
        Returns: boolean;
      };
    };
    Enums: {
      account_type: AccountType;
      financial_context: FinancialContext;
      transaction_kind: "income" | "expense" | "transfer";
      transaction_status: TransactionStatus;
      transfer_direction: TransferDirection;
    };
    CompositeTypes: Record<string, never>;
  };
};
