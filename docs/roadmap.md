# Roadmap

## Sprint 0 — Fundação

Estrutura Next.js, PWA inicial, Supabase, documentação, domínio monetário mínimo e qualidade automatizada.

## Sprint 1 — Identidade e segurança

Cadastro, confirmação de e-mail, login, logout, recuperação e troca de senha, sessão SSR, rotas privadas, perfil automático e RLS.

## Sprint 2 — Contas e categorias

Contas financeiras básicas, saldo inicial e data de referência, categorias padrão e personalizadas, contextos Pessoal/Profissional, preferência monetária, arquivamento lógico e RLS específico.

## Sprint 3 — Lançamentos e transferências

Receitas, despesas, estados Previsto/Realizado, filtros, edição e inativação lógica, transferências atômicas entre contas da mesma moeda e saldo atual calculado.

## Sprint 4 — Cartões de crédito

Cartões, compras à vista ou parceladas, competência por fechamento, faturas, pagamento integral, estorno seguro e limites derivados.

## Sprint 5 — Recorrências

Receitas e despesas semanais, mensais ou anuais, calendário ancorado para meses curtos, data final opcional, geração idempotente de lançamentos previstos e estados ativa, suspensa e encerrada.

## Sprint 6 — Orçamento mensal

Planejamento mensal por categoria, contexto e moeda, comparação entre planejado e realizado, reconhecimento das parcelas de cartão por competência, exclusão de transferências e pagamentos técnicos, cópia idempotente do mês anterior e isolamento por RLS.

## Sprint 7 — Dashboard financeiro

Visão mensal consolidada por moeda com saldos por conta, receitas, despesas de consumo, resultado, orçamento consumido, próximas recorrências e faturas não pagas. Evolução dos últimos seis meses e distribuição por categoria usam consultas agregadas seguras, estados vazios, carregamento e layout responsivo.

## Sprint 8 — Patrimônio líquido

Ativos e passivos manuais separados das contas transacionais, avaliações históricas, arquivamento lógico e resumo de patrimônio líquido por moeda. Serviços exclusivos do servidor, RLS e migrations cumulativas preservam isolamento e exatidão.

## Próximas sprints

Investimentos, importações, relatórios analíticos, avaliações automáticas de mercado e recursos avançados de cartão serão planejados separadamente.
