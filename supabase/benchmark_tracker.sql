-- ═════════════════════════════════════════════════════════════
-- BENCHMARK TRACKER — six-month checkpoint archive + screenshot sync
--
-- Run in Supabase → SQL Editor AFTER schema.sql / security.sql.
-- Safe to re-run.
--
-- What this adds:
--   1. benchmark_checkpoints table (the saved player cards)
--   2. per-member RLS for their own checkpoints
--   3. storage bucket for uploaded stats screenshots
--   4. founder-facing benchmark review data
-- ═════════════════════════════════════════════════════════════

create table if not exists benchmark_checkpoints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  academy_id text not null references profiles(academy_id) on delete cascade,
  handle text not null,
  coach_id text,
  client_id text not null,
  checkpoint_no int not null,
  cycle_no int not null default 1,
  month_no int not null,
  title text not null default '',
  label text not null default '',
  summary jsonb not null default '{}'::jsonb,
  matches jsonb not null default '[]'::jsonb,
  screenshots jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_id)
);
create index if not exists idx_benchmark_user_created on benchmark_checkpoints (user_id, created_at desc);
create index if not exists idx_benchmark_academy_created on benchmark_checkpoints (academy_id, created_at desc);

alter table benchmark_checkpoints enable row level security;

drop policy if exists benchmark_read_own on benchmark_checkpoints;
create policy benchmark_read_own on benchmark_checkpoints
  for select to authenticated
  using (user_id in (select id from profiles where auth_user_id = auth.uid()));

drop policy if exists benchmark_insert_own on benchmark_checkpoints;
create policy benchmark_insert_own on benchmark_checkpoints
  for insert to authenticated
  with check (user_id in (select id from profiles where auth_user_id = auth.uid()));

drop policy if exists benchmark_update_own on benchmark_checkpoints;
create policy benchmark_update_own on benchmark_checkpoints
  for update to authenticated
  using (user_id in (select id from profiles where auth_user_id = auth.uid()))
  with check (user_id in (select id from profiles where auth_user_id = auth.uid()));

drop policy if exists benchmark_delete_own on benchmark_checkpoints;
create policy benchmark_delete_own on benchmark_checkpoints
  for delete to authenticated
  using (user_id in (select id from profiles where auth_user_id = auth.uid()));

create or replace function touch_benchmark_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_touch_benchmark_updated_at on benchmark_checkpoints;
create trigger trg_touch_benchmark_updated_at
  before update on benchmark_checkpoints
  for each row execute function touch_benchmark_updated_at();

insert into storage.buckets (id, name, public)
values ('benchmark-screens', 'benchmark-screens', false)
on conflict (id) do nothing;

-- members may read/upload/delete only their own screenshot folder:
-- benchmark-screens/<ACADEMY_ID>/...
drop policy if exists benchmark_storage_read_own on storage.objects;
create policy benchmark_storage_read_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'benchmark-screens'
    and split_part(name, '/', 1) in (
      select academy_id from profiles where auth_user_id = auth.uid()
    )
  );

drop policy if exists benchmark_storage_insert_own on storage.objects;
create policy benchmark_storage_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'benchmark-screens'
    and split_part(name, '/', 1) in (
      select academy_id from profiles where auth_user_id = auth.uid()
    )
  );

drop policy if exists benchmark_storage_update_own on storage.objects;
create policy benchmark_storage_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'benchmark-screens'
    and split_part(name, '/', 1) in (
      select academy_id from profiles where auth_user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'benchmark-screens'
    and split_part(name, '/', 1) in (
      select academy_id from profiles where auth_user_id = auth.uid()
    )
  );

drop policy if exists benchmark_storage_delete_own on storage.objects;
create policy benchmark_storage_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'benchmark-screens'
    and split_part(name, '/', 1) in (
      select academy_id from profiles where auth_user_id = auth.uid()
    )
  );

-- founder review helper — service role / founder desk only
create or replace function founder_benchmark_cards(p_limit int default 24)
returns table (
  id uuid,
  user_id uuid,
  academy_id text,
  handle text,
  coach_id text,
  client_id text,
  checkpoint_no int,
  cycle_no int,
  month_no int,
  title text,
  label text,
  summary jsonb,
  matches jsonb,
  screenshots jsonb,
  created_at timestamptz,
  synced_at timestamptz,
  region text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    b.id,
    b.user_id,
    b.academy_id,
    b.handle,
    b.coach_id,
    b.client_id,
    b.checkpoint_no,
    b.cycle_no,
    b.month_no,
    b.title,
    b.label,
    b.summary,
    b.matches,
    b.screenshots,
    b.created_at,
    b.synced_at,
    p.region
  from benchmark_checkpoints b
  left join profiles p on p.id = b.user_id
  order by b.created_at desc
  limit greatest(1, least(coalesce(p_limit, 24), 100));
$$;
revoke execute on function founder_benchmark_cards(int) from public, anon, authenticated;
grant execute on function founder_benchmark_cards(int) to service_role;

-- Proof
 do $$
 begin
   raise notice 'BENCHMARK TRACKER ARMED · table + storage bucket ready';
 end $$;
