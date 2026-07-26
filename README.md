# MeuMoney

Progressive Web App de gestão financeira pessoal. A feature atual transforma a página inicial privada em um dashboard financeiro mensal consolidado e separado por moeda.

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

## Dashboard financeiro

- saldos atuais por conta, receitas, despesas de consumo e resultado mensal;
- orçamento consumido, próximas recorrências e faturas não pagas;
- evolução do mês selecionado e dos cinco anteriores;
- distribuição das despesas por categoria;
- seções independentes para BRL, USD e EUR, sem conversão implícita;
- consultas agregadas no PostgreSQL, valores inteiros, RLS e isolamento por usuário.

Cashback, milhas, juros rotativos, parcelamento de fatura, antecipação, conversão cambial e investimentos permanecem fora desta entrega.

## Qualidade

```bash
npm.cmd run check
```

## Branches

- `main`: releases estáveis;
- `develop`: integração da próxima versão;
- `feature/*`: trabalho isolado com merge para `develop`.
