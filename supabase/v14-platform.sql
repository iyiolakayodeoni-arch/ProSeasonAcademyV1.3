-- ═════════════════════════════════════════════════════════════
-- v14 PLATFORM — sign-in, announcements, news drafts, push,
-- location pricing. Safe to re-run.
-- Run in Supabase → SQL Editor AFTER RUN_ALL.sql.
-- ═════════════════════════════════════════════════════════════

-- ── 1 · PROFILE FIELDS ───────────────────────────────────────
alter table profiles add column if not exists is_founder boolean not null default false;
alter table profiles add column if not exists email text;
alter table profiles add column if not exists username text;
alter table profiles add column if not exists country text;
alter table profiles add column if not exists country_code text;       -- ISO-2 e.g. NG
alter table profiles add column if not exists geo_verified boolean not null default false;
alter table profiles add column if not exists geo_source text;         -- 'ip' | 'manual' | 'founder'
alter table profiles add column if not exists geo_uncertain boolean not null default false;
alter table profiles add column if not exists status text not null default 'active';

-- founder row is always founder
update profiles set is_founder = true where academy_id = 'PSA-FOUNDER';

-- unique username among living seats (nulls allowed for legacy)
create unique index if not exists profiles_username_unique
  on profiles (lower(username)) where username is not null;

create unique index if not exists profiles_email_unique
  on profiles (lower(email)) where email is not null;

-- ── 2 · OPEN REGISTRATION DEFAULT (review invite_only) ───────
-- Open registration is the product decision for this rebuild.
-- Invite codes still work when invite_only is flipped true from the Desk.
insert into config (key, value) values
  ('invite_only', 'false'),
  ('till_closed', 'true'),
  ('go_live', ''),
  ('location_enforce', 'true')
on conflict (key) do update set value = excluded.value
  where config.key in ('invite_only', 'till_closed', 'location_enforce');

-- keep till closed until the founder opens payments from the Desk
update config set value = '' where key = 'go_live' and value is not null
  and value <> '' and value::timestamptz > now() + interval '30 days';

-- ── 3 · FOUNDER ANNOUNCEMENTS ───────────────────────────────
create table if not exists founder_announcements (
  id bigint generated always as identity primary key,
  author_handle text not null default 'POCOLASTONES',
  title text not null,
  body text not null,
  link_url text,
  update_type text not null default 'update',  -- update | alert | patch | welcome
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  active boolean not null default true,
  created_by uuid references profiles(id)
);

create table if not exists announcement_reads (
  announcement_id bigint not null references founder_announcements(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

alter table founder_announcements enable row level security;
alter table announcement_reads enable row level security;

drop policy if exists fa_read on founder_announcements;
create policy fa_read on founder_announcements
  for select to authenticated
  using (active = true and (expires_at is null or expires_at > now()));

drop policy if exists ar_own on announcement_reads;
create policy ar_own on announcement_reads
  for all to authenticated
  using (user_id in (select id from profiles where auth_user_id = auth.uid()))
  with check (user_id in (select id from profiles where auth_user_id = auth.uid()));

-- live feed of active announcements
create or replace function list_announcements()
returns table (
  id bigint,
  author_handle text,
  title text,
  body text,
  link_url text,
  update_type text,
  published_at timestamptz,
  expires_at timestamptz,
  is_read boolean
)
language sql security definer stable set search_path = public as $$
  select
    a.id, a.author_handle, a.title, a.body, a.link_url, a.update_type,
    a.published_at, a.expires_at,
    exists (
      select 1 from announcement_reads r
      join profiles p on p.id = r.user_id
      where r.announcement_id = a.id and p.auth_user_id = auth.uid()
    ) as is_read
  from founder_announcements a
  where a.active
    and (a.expires_at is null or a.expires_at > now())
  order by a.published_at desc
  limit 40;
$$;
grant execute on function list_announcements() to authenticated;

create or replace function mark_announcement_read(p_id bigint)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  select id into v_uid from profiles where auth_user_id = auth.uid();
  if v_uid is null then return false; end if;
  insert into announcement_reads (announcement_id, user_id)
  values (p_id, v_uid)
  on conflict do nothing;
  return true;
end $$;
grant execute on function mark_announcement_read(bigint) to authenticated;

create or replace function unread_announcement_count()
returns int
language sql security definer stable set search_path = public as $$
  select count(*)::int
  from founder_announcements a
  where a.active
    and (a.expires_at is null or a.expires_at > now())
    and not exists (
      select 1 from announcement_reads r
      join profiles p on p.id = r.user_id
      where r.announcement_id = a.id and p.auth_user_id = auth.uid()
    );
$$;
grant execute on function unread_announcement_count() to authenticated;

-- founder-only publish (service role or is_founder session via edge fn)
create or replace function publish_announcement(
  p_title text,
  p_body text,
  p_link text default null,
  p_type text default 'update',
  p_expires_days int default null,
  p_author text default 'POCOLASTONES'
) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_uid uuid; v_founder boolean;
begin
  select id, is_founder into v_uid, v_founder
    from profiles where auth_user_id = auth.uid();
  if not coalesce(v_founder, false) then
    raise exception 'FOUNDER_ONLY';
  end if;

  insert into founder_announcements
    (author_handle, title, body, link_url, update_type, expires_at, created_by)
  values (
    left(coalesce(nullif(trim(p_author), ''), 'POCOLASTONES'), 40),
    left(trim(p_title), 120),
    left(trim(p_body), 4000),
    nullif(left(trim(coalesce(p_link, '')), 500), ''),
    case when p_type in ('update','alert','patch','welcome') then p_type else 'update' end,
    case when p_expires_days is not null and p_expires_days > 0
      then now() + (p_expires_days || ' days')::interval else null end,
    v_uid
  )
  returning id into v_id;

  -- queue a push for every seated member with a token
  insert into notification_queue (kind, title, body, data, academy_id)
  select
    'founder_announcement',
    'FOUNDER ANNOUNCEMENT',
    left(trim(p_title), 120),
    jsonb_build_object('announcementId', v_id, 'deepLink', 'home'),
    p.academy_id
  from profiles p
  where p.academy_id <> 'PSA-FOUNDER'
    and coalesce(p.status, 'active') <> 'removed';

  return v_id;
end $$;
revoke execute on function publish_announcement(text, text, text, text, int, text) from public, anon;
grant execute on function publish_announcement(text, text, text, text, int, text) to authenticated, service_role;

-- ── 4 · NEWS DRAFTS (MetaBot → founder review → Home) ───────
create table if not exists news_drafts (
  id text primary key,                         -- mb-YYYY-MM-DD-00n
  kind text not null default 'META_SHIFT',
  headline text not null,
  body text not null,
  cta text not null default 'READ MORE ›',
  source_url text not null,
  source_name text not null default 'unknown',
  discovered_at date not null default current_date,
  patch_version text,
  confidence numeric(4,2) default 0.70,
  status text not null default 'pending_review', -- pending_review | approved | rejected | published
  fingerprint text,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_news_status on news_drafts (status, discovered_at desc);
create unique index if not exists idx_news_fingerprint on news_drafts (fingerprint) where fingerprint is not null;

alter table news_drafts enable row level security;

-- members only see published news
drop policy if exists news_read_published on news_drafts;
create policy news_read_published on news_drafts
  for select to authenticated
  using (status = 'published');

create or replace function list_published_news(p_limit int default 30)
returns setof news_drafts
language sql security definer stable set search_path = public as $$
  select * from news_drafts
  where status = 'published'
  order by coalesce(published_at, created_at) desc
  limit least(coalesce(p_limit, 30), 100);
$$;
grant execute on function list_published_news(int) to authenticated;

create or replace function founder_review_news(p_id text, p_approve boolean)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_founder boolean;
begin
  select is_founder into v_founder from profiles where auth_user_id = auth.uid();
  if not coalesce(v_founder, false) then raise exception 'FOUNDER_ONLY'; end if;

  update news_drafts
     set status = case when p_approve then 'published' else 'rejected' end,
         reviewed_at = now(),
         published_at = case when p_approve then now() else published_at end
   where id = p_id
     and status in ('pending_review', 'approved');
  return found;
end $$;
grant execute on function founder_review_news(text, boolean) to authenticated, service_role;

-- ── 5 · PUSH TOKENS + NOTIFICATION QUEUE ───────────────────
create table if not exists push_tokens (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  academy_id text not null,
  token text not null,
  platform text,
  prefs jsonb not null default '{}'::jsonb,
  quiet_start int,          -- hour 0-23 local, optional
  quiet_end int,
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

create table if not exists notification_queue (
  id bigint generated always as identity primary key,
  academy_id text,                              -- null = broadcast
  kind text not null,                           -- founder_announcement | coach_lesson | group_session | news | match_scan
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  deep_link text,
  status text not null default 'pending',       -- pending | sent | failed | skipped
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists idx_nq_pending on notification_queue (status, created_at) where status = 'pending';

alter table push_tokens enable row level security;
alter table notification_queue enable row level security;

drop policy if exists push_own on push_tokens;
create policy push_own on push_tokens
  for all to authenticated
  using (user_id in (select id from profiles where auth_user_id = auth.uid()))
  with check (user_id in (select id from profiles where auth_user_id = auth.uid()));

-- members never read the queue
drop policy if exists nq_none on notification_queue;
-- no member policy — service role only

create or replace function register_push_token(
  p_token text,
  p_platform text default null,
  p_prefs jsonb default '{}'::jsonb,
  p_quiet_start int default null,
  p_quiet_end int default null
) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_aid text;
begin
  select id, academy_id into v_uid, v_aid from profiles where auth_user_id = auth.uid();
  if v_uid is null then return false; end if;
  if p_token is null or length(trim(p_token)) < 8 then return false; end if;

  insert into push_tokens (user_id, academy_id, token, platform, prefs, quiet_start, quiet_end)
  values (
    v_uid, v_aid, trim(p_token), left(coalesce(p_platform, ''), 24),
    coalesce(p_prefs, '{}'::jsonb), p_quiet_start, p_quiet_end
  )
  on conflict (user_id, token) do update set
    platform = excluded.platform,
    prefs = excluded.prefs,
    quiet_start = excluded.quiet_start,
    quiet_end = excluded.quiet_end,
    updated_at = now();
  return true;
end $$;
grant execute on function register_push_token(text, text, jsonb, int, int) to authenticated;

-- ── 6 · LOCATION → PRICING ──────────────────────────────────
-- Country code → geo track. Nigeria pricing is NG only.
create or replace function geo_for_country(p_code text)
returns text
language sql immutable as $$
  select case upper(trim(coalesce(p_code, '')))
    when 'NG' then 'africa'
    when 'GH' then 'africa'
    when 'KE' then 'africa'
    when 'EG' then 'africa'
    when 'ZA' then 'africa'
    when 'TZ' then 'africa'
    when 'UG' then 'africa'
    when 'RW' then 'africa'
    when 'SN' then 'africa'
    when 'CI' then 'africa'
    when 'CM' then 'africa'
    when 'ET' then 'africa'
    when 'MA' then 'africa'
    when 'DZ' then 'africa'
    when 'TN' then 'africa'
    when 'AO' then 'africa'
    when 'MZ' then 'africa'
    when 'ZM' then 'africa'
    when 'ZW' then 'africa'
    when 'BW' then 'africa'
    when 'NA' then 'africa'
    when 'MW' then 'africa'
    when 'BJ' then 'africa'
    when 'TG' then 'africa'
    when 'BF' then 'africa'
    when 'ML' then 'africa'
    when 'NE' then 'africa'
    when 'LR' then 'africa'
    when 'SL' then 'africa'
    when 'GM' then 'africa'
    when 'GN' then 'africa'
    when 'CD' then 'africa'
    when 'CG' then 'africa'
    when 'GA' then 'africa'
    when 'SD' then 'africa'
    when 'SS' then 'africa'
    when 'SO' then 'africa'
    when 'LY' then 'africa'
    when 'MR' then 'africa'
    when 'CV' then 'africa'
    when 'SC' then 'africa'
    when 'MU' then 'africa'
    when 'MG' then 'africa'
    when '' then 'unset'
    else 'world'
  end;
$$;
grant execute on function geo_for_country(text) to anon, authenticated, service_role;

-- Nigeria naira shelf only when country_code = NG (not "rest of africa")
create or replace function pricing_region_for(p_code text, p_geo text)
returns text
language sql immutable as $$
  select case
    when upper(trim(coalesce(p_code, ''))) = 'NG' then 'africa'
    when lower(coalesce(p_geo, '')) = 'africa' and upper(trim(coalesce(p_code, ''))) <> 'NG'
      then 'world'  -- non-NG Africa still sees world shelf until local pricing lands
    when lower(coalesce(p_geo, '')) = 'africa' then 'africa'
    when lower(coalesce(p_geo, '')) = 'world' then 'world'
    else 'unset'
  end;
$$;
grant execute on function pricing_region_for(text, text) to anon, authenticated, service_role;

create or replace function set_my_location(
  p_country text,
  p_country_code text,
  p_source text default 'manual',
  p_uncertain boolean default false
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_code text := upper(trim(coalesce(p_country_code, '')));
  v_geo text;
  v_price text;
  v_enforce boolean;
begin
  select (value = 'true') into v_enforce from config where key = 'location_enforce';
  v_geo := geo_for_country(v_code);
  v_price := pricing_region_for(v_code, v_geo);

  -- refuse Nigeria shelf without NG code when enforcement is on
  if coalesce(v_enforce, true) and v_price = 'africa' and v_code <> 'NG' then
    v_price := 'world';
    v_geo := 'world';
  end if;

  update profiles set
    country = left(trim(coalesce(p_country, '')), 40),
    country_code = nullif(v_code, ''),
    region = v_price,
    geo_verified = (p_source in ('ip', 'founder') and not p_uncertain),
    geo_source = left(coalesce(p_source, 'manual'), 24),
    geo_uncertain = p_uncertain
  where auth_user_id = auth.uid();

  if not found then
    return jsonb_build_object('ok', false, 'error', 'NO_PROFILE');
  end if;

  return jsonb_build_object(
    'ok', true,
    'countryCode', nullif(v_code, ''),
    'geo', v_geo,
    'pricingRegion', v_price,
    'verified', (p_source in ('ip', 'founder') and not p_uncertain),
    'uncertain', p_uncertain
  );
end $$;
grant execute on function set_my_location(text, text, text, boolean) to authenticated;

-- founder override of a member's pricing region
create or replace function founder_set_location(
  p_academy text,
  p_country_code text,
  p_geo text default null
) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_founder boolean; v_code text; v_geo text; v_price text;
begin
  select is_founder into v_founder from profiles where auth_user_id = auth.uid();
  if not coalesce(v_founder, false) then raise exception 'FOUNDER_ONLY'; end if;

  v_code := upper(trim(coalesce(p_country_code, '')));
  v_geo := coalesce(nullif(lower(trim(coalesce(p_geo, ''))), ''), geo_for_country(v_code));
  v_price := pricing_region_for(v_code, v_geo);

  update profiles set
    country_code = nullif(v_code, ''),
    region = v_price,
    geo_verified = true,
    geo_source = 'founder',
    geo_uncertain = false
  where academy_id = upper(trim(p_academy))
    and academy_id <> 'PSA-FOUNDER';
  return found;
end $$;
grant execute on function founder_set_location(text, text, text) to authenticated, service_role;

-- ── 7 · USERNAME AVAILABILITY ───────────────────────────────
create or replace function username_available(p_username text)
returns boolean
language sql security definer stable set search_path = public as $$
  select not exists (
    select 1 from profiles
    where lower(username) = lower(trim(p_username))
       or lower(handle) = lower(trim(p_username))
  );
$$;
grant execute on function username_available(text) to anon, authenticated;

-- ── 8 · ACCOUNT DELETION (member self-service) ──────────────
create or replace function delete_my_account()
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_aid text; v_auth uuid;
begin
  select id, academy_id, auth_user_id into v_uid, v_aid, v_auth
    from profiles where auth_user_id = auth.uid();
  if v_uid is null then return false; end if;
  if v_aid = 'PSA-FOUNDER' then raise exception 'FOUNDER_PROTECTED'; end if;

  update profiles set status = 'removed', handle = 'DELETED-' || left(v_aid, 8)
    where id = v_uid;
  delete from push_tokens where user_id = v_uid;
  -- auth.users cascade removes the profile when the edge fn deletes the user
  return true;
end $$;
grant execute on function delete_my_account() to authenticated;

-- ── 9 · REALTIME for announcements ──────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'founder_announcements'
  ) then
    alter publication supabase_realtime add table founder_announcements;
  end if;
exception when others then
  raise notice 'realtime publication skip: %', sqlerrm;
end $$;

-- ── 10 · PROOF ──────────────────────────────────────────────
do $$
begin
  raise notice 'v14 PLATFORM ARMED';
  raise notice '  founder_announcements · news_drafts · push_tokens · location pricing';
  raise notice '  invite_only default false · till stays closed until Desk opens it';
end $$;
