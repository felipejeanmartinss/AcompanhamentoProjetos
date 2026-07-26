import Link from "next/link";
import { toggleInvestmentPositionStatus } from "@/app/actions/investments";
import { CONTEXT_LABELS } from "@/domain/accounts";
import { CURRENCY_LOCALES } from "@/domain/currencies";
import {
  formatInvestmentQuantity,
  INVESTMENT_CLASS_LABELS,
  summarizeInvestmentsByCurrency,
} from "@/domain/investments";
import { formatMoney } from "@/domain/money";
import { listCurrentUserInvestmentPositions } from "@/services/finance/investments-service";
import type { InvestmentPositionSummary } from "@/types/database";

export const metadata = { title: "Investimentos" };

const messages: Record<string, string> = {
  created: "Posição de investimento cadastrada com sucesso.",
  updated: "Posição e fotografia histórica atualizadas com sucesso.",
  "status-updated": "Estado da posição atualizado com sucesso.",
  "status-error": "Não foi possível alterar o estado da posição.",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
    new Date(`${value}T12:00:00`),
  );
}

function PositionCard({ position }: { position: InvestmentPositionSummary }) {
  const archived = !position.is_active;
  const differenceIsNegative = position.unrealized_appreciation_minor < 0;

  return (
    <article
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${
        archived ? "opacity-70" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
            {INVESTMENT_CLASS_LABELS[position.investment_class]} ·{" "}
            {CONTEXT_LABELS[position.context]}
          </p>
          <h3 className="mt-1 text-xl font-bold text-slate-950">
            {position.asset_name}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {position.institution}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            archived
              ? "bg-slate-100 text-slate-600"
              : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {archived ? "Arquivada" : "Ativa"}
        </span>
      </div>

      <p className="mt-5 text-2xl font-extrabold text-slate-950">
        {formatMoney(
          position.current_value_minor,
          position.currency,
          CURRENCY_LOCALES[position.currency],
        )}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {formatInvestmentQuantity(position.quantity)} unidades · posição de{" "}
        {formatDate(position.position_date)}
      </p>

      <dl className="mt-5 grid gap-2 border-t border-slate-100 pt-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-600">Custo acumulado</dt>
          <dd className="font-semibold text-slate-950">
            {formatMoney(
              position.accumulated_cost_minor,
              position.currency,
              CURRENCY_LOCALES[position.currency],
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-600">Diferença sobre o custo</dt>
          <dd
            className={`font-semibold ${
              differenceIsNegative ? "text-red-700" : "text-emerald-700"
            }`}
          >
            {formatMoney(
              position.unrealized_appreciation_minor,
              position.currency,
              CURRENCY_LOCALES[position.currency],
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-600">Renda registrada</dt>
          <dd className="font-semibold text-slate-950">
            {formatMoney(
              position.income_minor,
              position.currency,
              CURRENCY_LOCALES[position.currency],
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-600">Resultado total</dt>
          <dd className="text-right font-semibold text-slate-950">
            {position.total_result_minor === null
              ? "Histórico incompleto"
              : formatMoney(
                  position.total_result_minor,
                  position.currency,
                  CURRENCY_LOCALES[position.currency],
                )}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <Link
          href={`/investments/${position.id}/edit`}
          className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Atualizar
        </Link>
        <Link
          href={`/investments/${position.id}/history`}
          className="inline-flex min-h-10 items-center rounded-lg border border-blue-200 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
        >
          Histórico
        </Link>
        <form action={toggleInvestmentPositionStatus}>
          <input type="hidden" name="id" value={position.id} />
          <input
            type="hidden"
            name="archive"
            value={archived ? "false" : "true"}
          />
          <button
            type="submit"
            className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {archived ? "Reativar" : "Arquivar"}
          </button>
        </form>
      </div>
    </article>
  );
}

export default async function InvestmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const [{ positions, hasError }, params] = await Promise.all([
    listCurrentUserInvestmentPositions(),
    searchParams,
  ]);
  const feedback = params.message ? messages[params.message] : undefined;
  const feedbackIsError = params.message === "status-error";
  const summaries = summarizeInvestmentsByCurrency(
    positions.map((position) => ({
      id: position.id,
      userId: position.user_id,
      currency: position.currency,
      accumulatedCostMinor: position.accumulated_cost_minor,
      currentValueMinor: position.current_value_minor,
      historyIsComplete: position.history_is_complete,
      isActive: position.is_active,
    })),
    positions[0]?.user_id ?? "",
  );

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-blue-700">
            Carteira manual
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
            Investimentos
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Acompanhe posições, aportes, resgates e rendas sem cotações
            automáticas ou conversão entre moedas.
          </p>
        </div>
        <Link
          href="/investments/new"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-700 px-5 font-semibold text-white shadow-sm hover:bg-blue-800"
        >
          Nova posição
        </Link>
      </div>

      {feedback ? (
        <p
          role={feedbackIsError ? "alert" : "status"}
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedbackIsError
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {feedback}
        </p>
      ) : null}

      {hasError ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800"
        >
          Não foi possível carregar seus investimentos. Confirme se a migration
          da Sprint 9 foi aplicada ao Supabase deste ambiente.
        </p>
      ) : null}

      {!hasError && summaries.length > 0 ? (
        <section aria-labelledby="investment-summary-title">
          <h2
            id="investment-summary-title"
            className="text-2xl font-extrabold text-slate-950"
          >
            Valor atual por moeda
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Cada moeda permanece em seu próprio grupo patrimonial.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {summaries.map((summary) => (
              <article
                key={summary.currency}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-sm font-bold text-blue-700">
                  {summary.currency}
                </p>
                <p className="mt-3 text-2xl font-extrabold text-slate-950">
                  {formatMoney(
                    summary.currentValueMinor,
                    summary.currency,
                    CURRENCY_LOCALES[summary.currency],
                  )}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {!hasError && positions.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="text-xl font-bold text-slate-950">
            Nenhum investimento cadastrado
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-slate-600">
            Cadastre uma posição manual de renda fixa, ação, fundo, ETF, fundo
            imobiliário, previdência ou criptomoeda.
          </p>
          <Link
            href="/investments/new"
            className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-blue-700 px-4 font-semibold text-blue-700 hover:bg-blue-50"
          >
            Cadastrar primeira posição
          </Link>
        </section>
      ) : null}

      {!hasError && positions.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2">
          {positions.map((position) => (
            <PositionCard key={position.id} position={position} />
          ))}
        </section>
      ) : null}
    </main>
  );
}
