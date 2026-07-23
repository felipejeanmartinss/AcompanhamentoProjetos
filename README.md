# MeuMoney

Progressive Web App de gestão financeira pessoal. A Sprint 3 acrescenta receitas, despesas, transferências atômicas e saldos calculados à fundação segura de contas e categorias.

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

## Sprint 3

- receitas e despesas previstas ou realizadas;
- filtros por tipo, status, conta, categoria, período e atividade;
- edição, inativação e reativação sem exclusão física;
- transferências entre contas da mesma moeda, sempre com saída e entrada atômicas;
- saldo atual derivado do saldo inicial e das movimentações ativas realizadas;
- RLS, validações no banco e permissões mínimas para isolamento entre usuários.

Cartões, faturas, parcelamentos, recorrências, orçamentos, investimentos e dashboard financeiro completo permanecem fora desta entrega.

## Qualidade

```bash
npm.cmd run check
```

## Branches

- `main`: releases estáveis;
- `develop`: integração da próxima versão;
- `feature/*`: trabalho isolado com merge para `develop`.
