import { SummaryCard } from "@/components/dashboard/summary-card";

export default function DashboardPage() {
  return <main className="page"><h1>Visão geral</h1><p className="muted">A nova base do MeuMoney está pronta para evoluir.</p>
    <section className="grid"><SummaryCard label="Saldo disponível" value="R$ 0,00"/><SummaryCard label="Receitas" value="R$ 0,00"/><SummaryCard label="Despesas" value="R$ 0,00"/></section>
  </main>;
}
