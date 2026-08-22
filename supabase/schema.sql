-- João Victor Barbershop — estrutura de sincronização em nuvem
-- Rode este script uma vez no Supabase: menu SQL Editor -> New query -> cole -> Run.

-- Tabela única que guarda o estado da barbearia (compartilhado entre aparelhos)
create table if not exists public.app_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- MVP: acesso liberado com a chave pública (anon/publishable).
-- (Depois trocamos por login real por barbeiro, com regras mais restritas.)
drop policy if exists "app_state_all" on public.app_state;
create policy "app_state_all" on public.app_state
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- Habilita a sincronização em tempo real para esta tabela
do $$
begin
  alter publication supabase_realtime add table public.app_state;
exception
  when duplicate_object then null;
end $$;
