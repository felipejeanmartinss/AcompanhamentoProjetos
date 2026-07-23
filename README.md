# MeuMoney

Progressive Web App de gestão financeira pessoal. A Sprint 4 acrescenta cartões, compras parceladas, faturas e pagamentos seguros à fundação financeira existente.

## Stack

- Next.js 16, React 19, App Router e TypeScript estrito;
- Tailwind CSS 4;
- Supabase Auth, PostgreSQL, migrations e Row Level Security;
- PWA, Vitest e ESLint;
- Vercel e GitHub.

## Executar localmente

1. Copie `.env.example` para `.env.local` e informe a URL e a chave publicável do Supabase.
2. Instale as dependências com `npm.cmd install` no PowerShell.
3. Aplique as migrations com `npx.cmd supabase db reset` (ambiente local) ou pelo fluxo de deploy do Supabase.
4. Inicie com `npm.cmd run dev`.
5. Abra `http://localhost:3000` — não use a extensão Live Server, pois a aplicação precisa do servidor Next.js.

Configure no Supabase Auth as URLs permitidas `http://localhost:3000/**` e as URLs equivalentes da Vercel. Consulte [docs/local-setup.md](docs/local-setup.md).

## Sprint 4

- cadastro, edição, inativação e reativação de cartões;
- compras à vista ou parceladas, com divisão exata em centavos;
- competência automática pelo dia de fechamento e ajuste para meses curtos;
- faturas abertas, fechadas, pagas ou vencidas;
- pagamento integral com movimentação técnica na conta, sem duplicar consumo;
- limite utilizado e disponível derivados das parcelas não pagas;
- operações críticas atômicas, RLS e isolamento por usuário.

Recorrências, cashback, milhas, juros rotativos, parcelamento de fatura, antecipação, conversão cambial, orçamentos, investimentos e dashboard financeiro completo permanecem fora desta entrega. Veja [docs/credit-cards.md](docs/credit-cards.md).

## Qualidade

```bash
npm.cmd run check
```

## Branches

- `main`: releases estáveis;
- `develop`: integração da próxima versão;
- `feature/*`: trabalho isolado com merge para `develop`.
