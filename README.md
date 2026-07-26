# MeuMoney

Progressive Web App de gestão financeira pessoal. A feature atual acrescenta posições de investimento manuais, histórico de aportes, resgates e rendas e integração segura ao patrimônio líquido por moeda.

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

## Patrimônio líquido

- imóveis, veículos, outros bens, financiamentos, empréstimos e outras dívidas;
- histórico automático de avaliações;
- resumo de ativos, passivos e patrimônio líquido por BRL, USD e EUR;
- arquivamento lógico e isolamento por usuário com RLS;
- valores inteiros e serviços exclusivos do servidor;
- tabelas patrimoniais independentes de contas e movimentações.

Conversão cambial, investimentos com cotação, depreciação automática e integração de bens com contas permanecem fora desta entrega.

## Investimentos

- renda fixa, ações, fundos, ETFs, fundos imobiliários, previdência e criptomoedas;
- instituição, ativo, quantidade decimal exata, custo acumulado e valor atual;
- fotografias históricas da posição e fluxos separados de aporte, resgate e renda;
- resultado total somente quando o histórico for declarado completo;
- valor atual integrado ao patrimônio, sem misturar moedas;
- RLS, arquivamento lógico e serviços exclusivos do servidor.

Cotações automáticas, integração bancária, conversão cambial e cálculo de
rentabilidade sem histórico suficiente permanecem fora da Sprint 9.

## Qualidade

```bash
npm.cmd run check
```

## Branches

- `main`: releases estáveis;
- `develop`: integração da próxima versão;
- `feature/*`: trabalho isolado com merge para `develop`.
