-- Seed idempotente para desenvolvimento local.
insert into public.categories (user_id, name, kind, context, is_system)
select auth.uid(), seed.name, seed.kind, seed.context, true
from (values
  ('Salário', 'income', 'personal'), ('Receita profissional', 'income', 'professional'),
  ('Custos fixos', 'expense', 'personal'), ('Conforto', 'expense', 'personal'),
  ('Metas', 'expense', 'personal'), ('Prazeres', 'expense', 'personal'),
  ('Conhecimento', 'expense', 'personal')
) as seed(name, kind, context)
where auth.uid() is not null
on conflict do nothing;
