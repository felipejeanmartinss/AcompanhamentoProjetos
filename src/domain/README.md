# Domínio

Regras financeiras puras e invariantes vivem aqui. Este módulo não pode importar React, Next.js, Supabase ou qualquer detalhe de infraestrutura.

Casos de uso e serviços podem depender do domínio; o domínio nunca depende deles.

As regras de orçamento em `budgets.ts` espelham a agregação autoritativa do
PostgreSQL para permitir testes rápidos de competência, exclusões e isolamento.
