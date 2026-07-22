export interface CashFlowReport { incomeMinor: number; expenseMinor: number; balanceMinor: number; }
export interface ReportService { cashFlow(from: string, to: string): Promise<CashFlowReport>; }
