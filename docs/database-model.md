# Modelo de dados

O primeiro esquema contém `profiles`, `accounts`, `categories` e `transactions`. Todas as entidades de produto pertencem a um usuário e possuem Row Level Security.

Valores monetários usam `bigint` com unidades menores. Datas de competência usam `date`; auditoria usa `timestamptz` em UTC.

Antes de suportar múltiplos usuários por espaço financeiro, será criada a entidade `workspace` e as políticas migrarão de propriedade direta para associação de membros.
