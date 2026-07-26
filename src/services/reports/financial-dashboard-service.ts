import "server-only";
import {
  fillMonthlyEvolution,
  referenceMonthsEndingAt,
  type DashboardMonthlySummary,
} from "@/domain/financial-dashboard";
import { coerceMinorUnits } from "@/domain/money";
import { SUPPORTED_CURRENCIES } from "@/domain/currencies";
import { requireUser } from "@/services/auth/server-auth";
import type {
  AccountBalance,
  FinancialDashboardExpenseCategory,
  FinancialDashboardInvoice,
  FinancialDashboardMonthlySummary,
  FinancialDashboardUpcomingRecurrence,
  Profile,
  SupportedCurrency,
} from "@/types/database";

const monthlySummaryColumns =
  "user_id, reference_month, currency, income_amount_minor, expense_amount_minor, result_amount_minor, planned_amount_minor, budget_percentage_consumed";
const categoryColumns =
  "user_id, reference_month, currency, category_id, category_name, context, expense_amount_minor";
const recurrenceColumns =
  "id, user_id, currency, account_name, category_name, context, transaction_type, description, amount_minor, frequency, next_occurrence";
const invoiceColumns =
  "id, user_id, credit_card_id, credit_card_name, currency, reference_month, due_date, status, effective_status, total_amount_minor, outstanding_amount_minor";
const accountColumns =
  "id, user_id, name, type, context, currency, opening_balance_minor, opening_balance_date, archived_at, created_at, updated_at, current_balance_minor";

function normalizeMonthlySummary(
  row: FinancialDashboardMonthlySummary,
): FinancialDashboardMonthlySummary {
  return {
    ...row,
    income_amount_minor: coerceMinorUnits(row.income_amount_minor),
    expense_amount_minor: coerceMinorUnits(row.expense_amount_minor),
    result_amount_minor: coerceMinorUnits(row.result_amount_minor),
    planned_amount_minor: coerceMinorUnits(row.planned_amount_minor),
    budget_percentage_consumed:
      row.budget_percentage_consumed === null
        ? null
        : Number(row.budget_percentage_consumed),
  };
}

function normalizeAccount(row: AccountBalance): AccountBalance {
  return {
    ...row,
    opening_balance_minor: coerceMinorUnits(row.opening_balance_minor),
    current_balance_minor: coerceMinorUnits(row.current_balance_minor),
  };
}

function normalizeCategory(
  row: FinancialDashboardExpenseCategory,
): FinancialDashboardExpenseCategory {
  return {
    ...row,
    expense_amount_minor: coerceMinorUnits(row.expense_amount_minor),
  };
}

function normalizeRecurrence(
  row: FinancialDashboardUpcomingRecurrence,
): FinancialDashboardUpcomingRecurrence {
  return { ...row, amount_minor: coerceMinorUnits(row.amount_minor) };
}

function normalizeInvoice(
  row: FinancialDashboardInvoice,
): FinancialDashboardInvoice {
  return {
    ...row,
    total_amount_minor: coerceMinorUnits(row.total_amount_minor),
    outstanding_amount_minor: coerceMinorUnits(row.outstanding_amount_minor),
  };
}

function todayInSaoPaulo(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export type FinancialDashboardCurrencyData = {
  currency: SupportedCurrency;
  accounts: AccountBalance[];
  accountBalanceMinor: number;
  selectedMonth: FinancialDashboardMonthlySummary;
  evolution: DashboardMonthlySummary[];
  categories: FinancialDashboardExpenseCategory[];
  recurrences: FinancialDashboardUpcomingRecurrence[];
  invoices: FinancialDashboardInvoice[];
};

export type FinancialDashboardData = {
  userEmail: string;
  profile: Profile | null;
  currencies: FinancialDashboardCurrencyData[];
  hasError: boolean;
};

export async function getFinancialDashboard(
  referenceMonth: string,
): Promise<FinancialDashboardData> {
  const { supabase, user } = await requireUser();
  const months = referenceMonthsEndingAt(referenceMonth);
  const firstReferenceMonth = `${months[0]}-01`;
  const selectedReferenceMonth = `${referenceMonth}-01`;
  const today = todayInSaoPaulo();

  const [
    profileResult,
    accountsResult,
    summariesResult,
    categoriesResult,
    recurrenceResults,
    invoiceResults,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, preferred_currency, created_at, updated_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("account_balances")
      .select(accountColumns)
      .eq("user_id", user.id)
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("financial_dashboard_monthly_summary")
      .select(monthlySummaryColumns)
      .eq("user_id", user.id)
      .gte("reference_month", firstReferenceMonth)
      .lte("reference_month", selectedReferenceMonth)
      .order("reference_month"),
    supabase
      .from("financial_dashboard_expense_categories")
      .select(categoryColumns)
      .eq("user_id", user.id)
      .eq("reference_month", selectedReferenceMonth)
      .order("expense_amount_minor", { ascending: false }),
    Promise.all(
      SUPPORTED_CURRENCIES.map((currency) =>
        supabase
          .from("financial_dashboard_upcoming_recurrences")
          .select(recurrenceColumns)
          .eq("user_id", user.id)
          .eq("currency", currency)
          .gte("next_occurrence", today)
          .order("next_occurrence")
          .limit(5),
      ),
    ),
    Promise.all(
      SUPPORTED_CURRENCIES.map((currency) =>
        supabase
          .from("financial_dashboard_invoices")
          .select(invoiceColumns)
          .eq("user_id", user.id)
          .eq("currency", currency)
          .order("due_date")
          .limit(5),
      ),
    ),
  ]);

  const accounts = (accountsResult.data ?? []).map(normalizeAccount);
  const summaries = (summariesResult.data ?? []).map(
    normalizeMonthlySummary,
  );
  const categories = (categoriesResult.data ?? []).map(normalizeCategory);
  const recurrences = recurrenceResults.flatMap((result) =>
    (result.data ?? []).map(normalizeRecurrence),
  );
  const invoices = invoiceResults.flatMap((result) =>
    (result.data ?? []).map(normalizeInvoice),
  );
  const profile = profileResult.data;

  const presentCurrencies = new Set<SupportedCurrency>([
    ...(profile ? [profile.preferred_currency] : []),
    ...accounts.map((row) => row.currency),
    ...summaries.map((row) => row.currency),
    ...categories.map((row) => row.currency),
    ...recurrences.map((row) => row.currency),
    ...invoices.map((row) => row.currency),
  ]);

  const currencies = SUPPORTED_CURRENCIES.filter((currency) =>
    presentCurrencies.has(currency),
  ).map((currency) => {
    const currencyAccounts = accounts.filter(
      (account) => account.currency === currency,
    );
    const selectedMonth = summaries.find(
      (row) =>
        row.currency === currency &&
        row.reference_month === selectedReferenceMonth,
    ) ?? {
      user_id: user.id,
      reference_month: selectedReferenceMonth,
      currency,
      income_amount_minor: 0,
      expense_amount_minor: 0,
      result_amount_minor: 0,
      planned_amount_minor: 0,
      budget_percentage_consumed: null,
    };

    return {
      currency,
      accounts: currencyAccounts,
      accountBalanceMinor: currencyAccounts.reduce(
        (total, account) =>
          coerceMinorUnits(total + account.current_balance_minor),
        0,
      ),
      selectedMonth,
      evolution: fillMonthlyEvolution(
        currency,
        referenceMonth,
        summaries.map((row) => ({
          currency: row.currency,
          referenceMonth: row.reference_month,
          incomeAmountMinor: row.income_amount_minor,
          expenseAmountMinor: row.expense_amount_minor,
          resultAmountMinor: row.result_amount_minor,
          plannedAmountMinor: row.planned_amount_minor,
          budgetPercentageConsumed: row.budget_percentage_consumed,
        })),
      ),
      categories: categories.filter((row) => row.currency === currency),
      recurrences: recurrences.filter((row) => row.currency === currency),
      invoices: invoices.filter((row) => row.currency === currency),
    };
  });

  return {
    userEmail: user.email ?? "",
    profile,
    currencies,
    hasError: Boolean(
      profileResult.error ||
        accountsResult.error ||
        summariesResult.error ||
        categoriesResult.error ||
        recurrenceResults.some((result) => result.error) ||
        invoiceResults.some((result) => result.error),
    ),
  };
}
