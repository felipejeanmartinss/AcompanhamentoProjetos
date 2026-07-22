export type FinancialContext = "personal" | "professional";
export type TransactionKind = "income" | "expense" | "transfer";

export interface Transaction {
  id: string;
  accountId: string;
  categoryId: string | null;
  description: string;
  amountMinor: number;
  currency: "BRL";
  kind: TransactionKind;
  context: FinancialContext;
  occurredOn: string;
  createdAt: string;
}
