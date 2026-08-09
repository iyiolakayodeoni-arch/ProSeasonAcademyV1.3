-- PROSEASON ACADEMY · COMMUNITY PROGRAM
-- Run after schema.sql/RUN_ALL.sql. This is deliberately separate so the
-- feature can be deployed and audited as one unit.
--
-- Security rule: every founder operation is performed inside the
-- community-admin Edge Function with a verified `profiles.is_founder` claim.
-- Client UI visibility is never used as authorisation.

create table if not exists community_groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,48}$'),
  name text not null check (char_length(name) between 3 and 60),
  description text not null default '' check (char_length(description) <= 280),
  archived boolean not null default false,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists community_group_members (
  group_id uuid not null references community_groups(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, profile_id)
);

-- A community suspension never touches the player's course account. It
-- removes their halls, draws and peer rooms until the founder reverses it.
create table if not exists community_suspensions (
  profile_id uuid primary key references profiles(id) on delete cascade,
  reason text not null default '',
  suspended_by uuid references profiles(id) on delete set null,
  suspended_at timestamptz not null default now()
);

create table if not exists peer_draws (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'open' check (status in ('open','closed','cancelled')),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists peer_pairs (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references peer_draws(id) on delete cascade,
  player_one uuid not null references profiles(id) on delete cascade,
  player_two uuid not null references profiles(id) on delete cascade,
  room_slug text not null unique,
  status text not null default 'active' check (status in ('active','complete','cancelled')),
  created_at timestamptz not null default now(),
  unique (draw_id, player_one), unique (draw_id, player_two),
  check (player_one <> player_two)
);

-- First responses remain private. `community_peer_review` reveals the other
-- player's answers only when BOTH submissions exist, stopping copy/paste and
-- making the cross-examination genuinely useful.
create table if not exists peer_reflections (
  pair_id uuid not null references peer_pairs(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  turning_point text not null check (char_length(turning_point) between 8 and 900),
  own_mistake text not null check (char_length(own_mistake) between 8 and 900),
  opponent_strength text not null check (char_length(opponent_strength) between 8 and 900),
  next_action text not null check (char_length(next_action) between 8 and 900),
  submitted_at timestamptz not null default now(),
  primary key (pair_id, profile_id)
);

create index if not exists peer_pairs_player_one_idx on peer_pairs(player_one, status, created_at desc);
create index if not exists peer_pairs_player_two_idx on peer_pairs(player_two, status, created_at desc);

alter table community_groups enable row level security;
alter table community_group_members enable row level security;
alter table community_suspensions enable row level security;
alter table peer_draws enable row level security;
alter table peer_pairs enable row level security;
alter table peer_reflections enable row level security;

-- No table policies are granted to normal users. The narrow security-definer
-- functions below are the only member-facing read/write surface.

create or replace function community_me()
returns uuid language sql stable security definer set search_path = public as $$
  select id from profiles where auth_user_id = auth.uid() limit 1
$$;

create or replace function community_can_use(p_profile uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where id = p_profile and status = 'active')
     and not exists(select 1 from community_suspensions where profile_id = p_profile)
$$;

create or replace function community_groups_for_me()
returns table(id uuid, slug text, name text, description text, joined_at timestamptz)
language sql stable security definer set search_path = public as $$
  select g.id, g.slug, g.name, g.description, m.joined_at
  from community_group_members m join community_groups g on g.id = m.group_id
  where m.profile_id = community_me() and not g.archived and community_can_use(community_me())
  order by g.name
$$;

grant execute on function community_groups_for_me() to authenticated;

create or replace function community_my_pair()
returns table(pair_id uuid, room_slug text, status text, partner_handle text, partner_academy_id text,
              draw_created_at timestamptz, submitted boolean, partner_submitted boolean)
language sql stable security definer set search_path = public as $$
  with mine as (select community_me() as id), pair as (
    select p.* from peer_pairs p, mine where p.status = 'active' and (p.player_one = mine.id or p.player_two = mine.id)
    order by p.created_at desc limit 1
  ), partner as (
    select pr.* from pair p join profiles pr on pr.id = case when p.player_one = community_me() then p.player_two else p.player_one end
  )
  select p.id, p.room_slug, p.status, partner.handle, partner.academy_id, d.created_at,
    exists(select 1 from peer_reflections r where r.pair_id=p.id and r.profile_id=community_me()),
    exists(select 1 from peer_reflections r where r.pair_id=p.id and r.profile_id=partner.id)
  from pair p join peer_draws d on d.id=p.draw_id cross join partner
  where community_can_use(community_me())
$$;

grant execute on function community_my_pair() to authenticated;

create or replace function community_submit_peer_review(p_pair uuid, p_turning text, p_own text, p_strength text, p_next text)
returns boolean language plpgsql security definer set search_path = public as $$
declare me_id uuid := community_me();
begin
  if not community_can_use(me_id) then raise exception 'COMMUNITY_SUSPENDED'; end if;
  if not exists(select 1 from peer_pairs where id=p_pair and status='active' and (player_one=me_id or player_two=me_id)) then
    raise exception 'NOT_YOUR_PAIR';
  end if;
  insert into peer_reflections(pair_id, profile_id, turning_point, own_mistake, opponent_strength, next_action)
  values (p_pair, me_id, left(trim(p_turning),900), left(trim(p_own),900), left(trim(p_strength),900), left(trim(p_next),900))
  on conflict(pair_id, profile_id) do update set turning_point=excluded.turning_point, own_mistake=excluded.own_mistake,
    opponent_strength=excluded.opponent_strength, next_action=excluded.next_action, submitted_at=now();
  return true;
end $$;
grant execute on function community_submit_peer_review(uuid,text,text,text,text) to authenticated;

create or replace function community_peer_review(p_pair uuid)
returns table(profile_id uuid, handle text, turning_point text, own_mistake text, opponent_strength text, next_action text, submitted_at timestamptz, revealed boolean)
language plpgsql stable security definer set search_path = public as $$
declare me_id uuid := community_me(); declare both_done boolean;
begin
  if not community_can_use(me_id) or not exists(select 1 from peer_pairs where id=p_pair and (player_one=me_id or player_two=me_id)) then return; end if;
  select count(*) = 2 into both_done from peer_reflections where pair_id=p_pair;
  return query select r.profile_id, pr.handle,
    case when both_done or r.profile_id=me_id then r.turning_point else null end,
    case when both_done or r.profile_id=me_id then r.own_mistake else null end,
    case when both_done or r.profile_id=me_id then r.opponent_strength else null end,
    case when both_done or r.profile_id=me_id then r.next_action else null end,
    r.submitted_at, both_done
  from peer_reflections r join profiles pr on pr.id=r.profile_id where r.pair_id=p_pair;
end $$;
grant execute on function community_peer_review(uuid) to authenticated;

-- Peer channels are private at the database layer. Existing public halls keep
-- their public behaviour; only `peer-*` channels use this pair membership gate.
create or replace function community_can_access_peer_room(p_slug text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from peer_pairs pp join profiles me on me.auth_user_id = auth.uid()
    where pp.room_slug = p_slug and (pp.player_one = me.id or pp.player_two = me.id or me.is_founder = true)
  )
$$;

drop policy if exists messages_read on messages;
create policy messages_read on messages for select to authenticated using (
  channel_slug not like 'peer-%' or community_can_access_peer_room(channel_slug)
);
drop policy if exists messages_post_own on messages;
create policy messages_post_own on messages for insert to authenticated with check (
  kind = 'text' and user_id in (select id from profiles where auth_user_id = auth.uid() and status = 'active')
  and (channel_slug not like 'peer-%' or community_can_access_peer_room(channel_slug))
);
drop policy if exists channels_read on channels;
create policy channels_read on channels for select to authenticated using (
  slug not like 'peer-%' or community_can_access_peer_room(slug)
);
