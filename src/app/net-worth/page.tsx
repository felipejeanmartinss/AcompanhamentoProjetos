import Link from "next/link";
import { toggleNetWorthItemStatus } from "@/app/actions/net-worth";
import { CONTEXT_LABELS } from "@/domain/accounts";
import { CURRENCY_LOCALES } from "@/domain/currencies";
import { formatMoney } from "@/domain/money";
import {
  NET_WORTH_ITEM_TYPE_LABELS,
  NET_WORTH_KIND_LABELS,
} from "@/domain/net-worth";
import { listCurrentUserNetWorth } from "@/services/finance/net-worth-service";
import type { NetWorthItem } from "@/types/database";

export const metadata = { title: "Patrimônio líquido" };

const messages: Record<string, string> = {
  created: "Item patrimonial cadastrado com sucesso.",
  updated: "Item e avaliação atualizados com sucesso.",
  "status-updated": "Estado do item patrimonial atualizado com sucesso.",
  "status-error": "Não foi possível alterar o estado do item patrimonial.",
};

function formatValuationDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
    new Date(`${value}T12:00:00`),
  );
}

function NetWorthItemSection({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: NetWorthItem[];
}) {
  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          Nenhum item neste grupo.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => {
            const archived = !item.is_active;
            return (
              <article
                key={item.id}
                className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${
                  archived ? "opacity-70" : ""
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                      {NET_WORTH_ITEM_TYPE_LABELS[item.item_type]} ·{" "}
                      {CONTEXT_LABELS[item.context]}
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-slate-950">
                      {item.name}
                    </h3>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      archived
                        ? "bg-slate-100 text-slate-600"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {archived ? "Arquivado" : "Ativo"}
                  </span>
                </div>

                <p className="mt-5 text-2xl font-extrabold text-slate-950">
                  {formatMoney(
                    item.current_value_minor,
                    item.currency,
                    CURRENCY_LOCALES[item.currency],
                  )}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Avaliação de {formatValuationDate(item.valuation_date)}
                </p>
                {item.notes ? (
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
                    {item.notes}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <Link
                    href={`/net-worth/${item.id}/edit`}
                    className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Editar
                  </Link>
                  <Link
                    href={`/net-worth/${item.id}/history`}
                    className="inline-flex min-h-10 items-center rounded-lg border border-blue-200 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    Histórico
                  </Link>
                  <form action={toggleNetWorthItemStatus}>
                    <input type="hidden" name="id" value={item.id} />
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
          })}
        </div>
      )}
    </section>
  );
}

export default async function NetWorthPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const [{ items, summaries, hasError }, params] = await Promise.all([
    listCurrentUserNetWorth(),
    searchParams,
  ]);
  const feedback = params.message ? messages[params.message] : undefined;
  const feedbackIsError = params.message === "status-error";
  const assets = items.filter((item) => item.kind === "asset");
  const liabilities = items.filter((item) => item.kind === "liability");

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-blue-700">
            Visão patrimonial
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
            Patrimônio líquido
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Acompanhe bens e dívidas manuais por moeda, sem misturá-los às
            contas usadas nas movimentações.
          </p>
        </div>
        <Link
          href="/net-worth/new"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-700 px-5 font-semibold text-white shadow-sm hover:bg-blue-800"
        >
          Novo item
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
          Não foi possível carregar seu patrimônio. Confirme se a migration da
          Sprint 8 foi aplicada ao Supabase deste ambiente.
        </p>
      ) : null}

      {!hasError && items.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="text-xl font-bold text-slate-950">
            Nenhum item patrimonial cadastrado
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-slate-600">
            Comece por um imóvel, veículo, outro bem, financiamento, empréstimo
            ou outra dívida.
          </p>
          <Link
            href="/net-worth/new"
            className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-blue-700 px-4 font-semibold text-blue-700 hover:bg-blue-50"
          >
            Cadastrar primeiro item
          </Link>
        </section>
      ) : null}

      {!hasError && summaries.length > 0 ? (
        <section aria-labelledby="net-worth-summary-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="net-worth-summary-title"
                className="text-2xl font-extrabold text-slate-950"
              >
                Resumo por moeda
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Nenhuma conversão cambial é aplicada entre os grupos.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {summaries.map((summary) => (
              <article
                key={summary.currency}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-sm font-bold text-blue-700">
                  {summary.currency}
                </p>
                <dl className="mt-4 grid gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-sm text-slate-600">Ativos manuais</dt>
                    <dd className="font-semibold text-emerald-700">
                      {formatMoney(
                        summary.manual_assets_minor,
                        summary.currency,
                        CURRENCY_LOCALES[summary.currency],
                      )}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-sm text-slate-600">Investimentos</dt>
                    <dd className="font-semibold text-emerald-700">
                      {formatMoney(
                        summary.investments_minor,
                        summary.currency,
                        CURRENCY_LOCALES[summary.currency],
                      )}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-sm text-slate-600">Ativos totais</dt>
                    <dd className="font-semibold text-emerald-700">
                      {formatMoney(
                        summary.assets_minor,
                        summary.currency,
                        CURRENCY_LOCALES[summary.currency],
                      )}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-sm text-slate-600">Passivos</dt>
                    <dd className="font-semibold text-red-700">
                      {formatMoney(
                        summary.liabilities_minor,
                        summary.currency,
                        CURRENCY_LOCALES[summary.currency],
                      )}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <dt className="font-semibold text-slate-950">
                      Patrimônio líquido
                    </dt>
                    <dd
                      className={`text-lg font-extrabold ${
                        summary.net_worth_minor < 0
                          ? "text-red-700"
                          : "text-slate-950"
                      }`}
                    >
                      {formatMoney(
                        summary.net_worth_minor,
                        summary.currency,
                        CURRENCY_LOCALES[summary.currency],
                      )}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {!hasError && items.length > 0 ? (
        <div className="grid gap-10">
          <NetWorthItemSection
            title={NET_WORTH_KIND_LABELS.asset + "s"}
            description="Imóveis, veículos e outros bens avaliados manualmente."
            items={assets}
          />
          <NetWorthItemSection
            title={NET_WORTH_KIND_LABELS.liability + "s"}
            description="Financiamentos, empréstimos e outras dívidas."
            items={liabilities}
          />
        </div>
      ) : null}
    </main>
  );
}
