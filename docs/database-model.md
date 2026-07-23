# Modelo de dados

## Perfis

`public.profiles` contém `id`, `full_name`, `preferred_currency`, `created_at` e `updated_at`. `id` referencia `auth.users(id)` com exclusão em cascata.

A função `handle_new_user` é `security definer`, usa `search_path` vazio, cria o perfil a partir de `raw_user_meta_data.full_name` e semeia as categorias padrão na mesma transação. Clientes autenticados recebem apenas `SELECT` e `UPDATE (full_name, preferred_currency)`; políticas RLS restringem ambas as operações a `auth.uid() = id`. Não há permissão de inserção ou exclusão pelo cliente.

## Contas

`public.accounts` contém proprietário, nome, tipo, contexto, moeda, `opening_balance_minor`, `opening_balance_date`, estado de arquivamento e timestamps. O saldo inicial usa `bigint`, nunca ponto flutuante. RLS separa leitura, inserção e atualização por `auth.uid() = user_id`; não existe política de exclusão.

## Categorias

`public.categories` contém proprietário, nome, natureza, contexto, indicador de categoria padrão, arquivamento e timestamps. A função `seed_default_categories` cria a taxonomia inicial de cada usuário e também atende usuários existentes durante a migration.

RLS permite leitura das categorias do proprietário. Inserção e atualização exigem `is_system = false`, e os privilégios por coluna impedem o cliente de transformar uma categoria personalizada em padrão. Não existe política de exclusão.

## Lançamentos

`public.transactions` representa somente receitas e despesas. O valor usa `bigint` positivo; `transaction_type` define seu efeito no saldo. `status` diferencia `pending` de `completed`, e `is_active` preserva o histórico sem exclusão física.

Um trigger valida que conta, categoria e usuário são compatíveis e que a natureza da categoria coincide com o tipo do lançamento. RLS e privilégios por coluna permitem leitura, inserção e atualização apenas ao proprietário; não há permissão de exclusão.

## Transferências

`public.transfers` é o registro canônico da operação. `public.transfer_entries` materializa exatamente duas movimentações vinculadas por `transfer_id` e direção única: `outflow` na origem e `inflow` no destino.

O cliente não recebe permissão de escrita direta nessas tabelas. As funções `create_transfer`, `update_transfer` e `set_transfer_active` validam propriedade, contas distintas, mesma moeda e executam a alteração dos dois lados na mesma transação do PostgreSQL.

## Saldos

`public.account_balances` é uma view com `security_invoker`. Ela deriva `current_balance_minor` do saldo inicial, dos lançamentos e das movimentações de transferência que estejam ativos e realizados. O saldo atual não é duplicado em uma coluna mutável.

## Integridade

- moedas aceitas: BRL, USD e EUR;
- saldo inicial limitado ao intervalo de inteiros seguros do TypeScript;
- `opening_balance_date` é obrigatória;
- nomes de categorias são únicos por usuário, natureza e contexto;
- valores de lançamentos e transferências são positivos e limitados ao intervalo inteiro seguro do TypeScript;
- cada transferência possui no máximo uma entrada e uma saída, garantidas por restrição única;
- triggers mantêm `updated_at`;
- chaves estrangeiras para o usuário usam exclusão em cascata, executada apenas quando o usuário é removido pelo fluxo administrativo de identidade.
