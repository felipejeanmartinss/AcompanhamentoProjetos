import type { Transaction } from "@/types/finance";

export interface TransactionService {
  list(accountId?: string): Promise<readonly Transaction[]>;
  create(input: Omit<Transaction, "id" | "createdAt">): Promise<Transaction>;
}
