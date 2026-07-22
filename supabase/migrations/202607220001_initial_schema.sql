create extension if not exists pgcrypto;

create type public.financial_context as enum ('personal', 'professional');
create type public.account_type as enum ('checking', 'savings', 'investment', 'credit_card', 'cash', 'other');
create type public.transaction_kind as enum ('income', 'expense', 'transfer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  type public.account_type not null,
  context public.financial_context not null,
  currency char(3) not null default 'BRL',
  opening_balance_minor bigint not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.categories(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 80),
  kind public.transaction_kind not null check (kind <> 'transfer'),
  context public.financial_context not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, name, kind, context)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  destination_account_id uuid references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete restrict,
  description text not null check (char_length(description) between 1 and 180),
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'BRL',
  kind public.transaction_kind not null,
  context public.financial_context not null,
  occurred_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'transfer' and destination_account_id is not null and category_id is null) or (kind <> 'transfer' and destination_account_id is null))
);

create index accounts_user_idx on public.accounts(user_id) where archived_at is null;
create index categories_user_idx on public.categories(user_id, kind, context);
create index transactions_user_date_idx on public.transactions(user_id, occurred_on desc);
create index transactions_account_idx on public.transactions(account_id, occurred_on desc);

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

create policy "profiles_owner_all" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "accounts_owner_all" on public.accounts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "categories_owner_all" on public.categories for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "transactions_owner_all" on public.transactions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
