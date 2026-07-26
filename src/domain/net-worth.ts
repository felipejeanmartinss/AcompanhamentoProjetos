import { z } from "zod";
import { FINANCIAL_CONTEXTS } from "./accounts";
import { SUPPORTED_CURRENCIES } from "./currencies";
import { isValidIsoDate } from "./dates";
import { assertMinorUnits, parseMoneyInputToMinor } from "./money";
import type {
  NetWorthItemKind,
  NetWorthItemType,
  SupportedCurrency,
} from "../types/database";

export const NET_WORTH_ITEM_TYPES = [
  "real_estate",
  "vehicle",
  "other_asset",
  "financing",
  "loan",
  "other_debt",
] as const;

export const NET_WORTH_ASSET_TYPES = [
  "real_estate",
  "vehicle",
  "other_asset",
] as const;

export const NET_WORTH_LIABILITY_TYPES = [
  "financing",
  "loan",
  "other_debt",
] as const;

export const NET_WORTH_ITEM_TYPE_LABELS: Record<NetWorthItemType, string> = {
  real_estate: "Imóvel",
  vehicle: "Veículo",
  other_asset: "Outro bem",
  financing: "Financiamento",
  loan: "Empréstimo",
  other_debt: "Outra dívida",
};

export const NET_WORTH_KIND_LABELS: Record<NetWorthItemKind, string> = {
  asset: "Ativo",
  liability: "Passivo",
};

const nonNegativeMoneyInput = z
  .string()
  .trim()
  .transform((value, context) => {
    try {
      return parseMoneyInputToMinor(value);
    } catch (error) {
      context.addIssue({
        code: "custom",
        message:
          error instanceof Error ? error.message : "Informe um valor válido.",
      });
      return z.NEVER;
    }
  })
  .refine((value) => value >= 0, "Informe um valor igual ou maior que zero.");

export const netWorthItemFormSchema = z.object({
  id: z.string().optional(),
  itemType: z.enum(NET_WORTH_ITEM_TYPES, {
    error: "Selecione o tipo do item.",
  }),
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do item.")
    .max(100, "Use até 100 caracteres."),
  currency: z.enum(SUPPORTED_CURRENCIES, {
    error: "Selecione uma moeda.",
  }),
  currentValueMinor: nonNegativeMoneyInput,
  valuationDate: z
    .string()
    .refine(isValidIsoDate, "Informe uma data de avaliação válida.")
    .refine(
      (value) => value <= new Date().toISOString().slice(0, 10),
      "A data de avaliação não pode estar no futuro.",
    ),
  context: z.enum(FINANCIAL_CONTEXTS, {
    error: "Selecione o contexto.",
  }),
  notes: z
    .string()
    .trim()
    .max(1000, "Use até 1.000 caracteres.")
    .transform((value) => value || null),
});

export const netWorthItemIdSchema = z.uuid("Item patrimonial inválido.");

export function kindForNetWorthItemType(
  itemType: NetWorthItemType,
): NetWorthItemKind {
  return (NET_WORTH_ASSET_TYPES as readonly NetWorthItemType[]).includes(
    itemType,
  )
    ? "asset"
    : "liability";
}

export type NetWorthSummaryInput = {
  userId: string;
  kind: NetWorthItemKind;
  currency: SupportedCurrency;
  currentValueMinor: number;
  isActive: boolean;
};

export type NetWorthCurrencySummary = {
  currency: SupportedCurrency;
  assetsMinor: number;
  liabilitiesMinor: number;
  netWorthMinor: number;
};

export function summarizeNetWorthByCurrency(
  items: readonly NetWorthSummaryInput[],
  currentUserId: string,
): NetWorthCurrencySummary[] {
  const summaries = new Map<
    SupportedCurrency,
    Omit<NetWorthCurrencySummary, "currency" | "netWorthMinor">
  >();

  for (const item of items) {
    if (!item.isActive || item.userId !== currentUserId) continue;

    const value = assertMinorUnits(item.currentValueMinor);
    if (value < 0) throw new Error("Net worth values cannot be negative.");

    const current = summaries.get(item.currency) ?? {
      assetsMinor: 0,
      liabilitiesMinor: 0,
    };

    if (item.kind === "asset") {
      current.assetsMinor = assertMinorUnits(current.assetsMinor + value);
    } else {
      current.liabilitiesMinor = assertMinorUnits(
        current.liabilitiesMinor + value,
      );
    }

    summaries.set(item.currency, current);
  }

  return SUPPORTED_CURRENCIES.flatMap((currency) => {
    const summary = summaries.get(currency);
    if (!summary) return [];

    return [
      {
        currency,
        assetsMinor: summary.assetsMinor,
        liabilitiesMinor: summary.liabilitiesMinor,
        netWorthMinor: assertMinorUnits(
          summary.assetsMinor - summary.liabilitiesMinor,
        ),
      },
    ];
  });
}
