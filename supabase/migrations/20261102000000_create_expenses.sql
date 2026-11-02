create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  store text not null default '',
  amount integer not null check (amount >= 0),
  category text not null default 'その他',
  note text not null default '',
  created_at timestamptz not null default now()
);
create index expenses_user_date_idx on public.expenses (user_id, date desc);
alter table public.expenses enable row level security;
create policy "select own" on public.expenses for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own" on public.expenses for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own" on public.expenses for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own" on public.expenses for delete to authenticated using ((select auth.uid()) = user_id);
