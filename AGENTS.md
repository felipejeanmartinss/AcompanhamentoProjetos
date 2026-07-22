# AGENTS.md

## Objetivo

Evoluir o MeuMoney como plataforma financeira confiável, acessível e modular. Mudanças devem preservar segurança, rastreabilidade e precisão monetária.

## Regras de desenvolvimento

- Trabalhe em `develop` ou `feature/*`; `main` recebe apenas versões estáveis.
- Nunca use ponto flutuante para dinheiro. Persista valores em centavos inteiros.
- Componentes de interface não acessam Supabase diretamente; use serviços/casos de uso.
- Toda tabela com dados de usuário deve ter RLS e políticas testáveis.
- Migrações são cumulativas. Nunca edite uma migração já aplicada em produção.
- Não exponha `SUPABASE_SERVICE_ROLE_KEY` ao navegador.
- Novas regras de negócio exigem teste unitário e atualização de `docs/business-rules.md`.
- Novas variáveis de ambiente exigem atualização de `.env.example`.
- Execute `npm run check` antes de solicitar merge.

## Organização

- `src/app`: rotas e composição visual.
- `src/components`: componentes reutilizáveis sem regras de negócio.
- `src/domain`: regras financeiras puras e invariantes.
- `src/services`: adaptadores de infraestrutura e orquestração.
- `src/types`: contratos compartilhados e tipos gerados.
- `supabase`: migrações, configuração e dados de desenvolvimento.
