# MeuMoney

Aplicação financeira pessoal e profissional orientada a fluxo de caixa, patrimônio e tomada de decisão.

## Stack

- Next.js App Router + React + TypeScript estrito.
- Supabase para PostgreSQL, autenticação e futura camada de arquivos.
- Vitest para regras de domínio.
- ESLint e CI para qualidade contínua.

## Começar

```bash
cp .env.example .env.local
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Qualidade

```bash
npm run check
```

## Branches

- `main`: releases estáveis.
- `develop`: integração da próxima versão.
- `feature/*`: trabalho isolado com merge para `develop`.

Consulte `docs/` antes de ampliar o domínio ou o banco de dados.
