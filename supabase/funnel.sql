-- PROSEASONACADEMY — core-practice funnel
-- Run after schema.sql. This deliberately records milestones only: no player
-- reflections, scorelines, recordings, device data or community content.

create table if not exists funnel_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null check (name in (
    'coach_selected',
    'baseline_day_1_started',
    'baseline_completed',
    'match_review_completed',
    'second_match_review_completed',
    'lesson_verdict_recorded'
  )),
  occurred_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists funnel_events_name_at on funnel_events (name, occurred_at desc);

alter table funnel_events enable row level security;

create policy "Members add their own funnel milestones"
on funnel_events for insert to authenticated
with check (user_id = (select id from profiles where auth_user_id = auth.uid()));

create policy "Founder reads the core funnel"
on funnel_events for select to authenticated
using (exists (
  select 1 from profiles where auth_user_id = auth.uid() and is_founder = true
));

-- Founder-friendly conversion counts. The six rows are always returned,
-- including zeroes, so the Desk can show an honest empty academy.
create or replace function public.core_funnel_rollup()
returns table(name text, members bigint)
language sql
security definer
set search_path = public
as $$
  select values.name, count(fe.id)::bigint as members
  from (values
    ('coach_selected'::text),
    ('baseline_day_1_started'::text),
    ('baseline_completed'::text),
    ('match_review_completed'::text),
    ('second_match_review_completed'::text),
    ('lesson_verdict_recorded'::text)
  ) as values(name)
  left join funnel_events fe on fe.name = values.name
  group by values.name
  order by array_position(array[
    'coach_selected', 'baseline_day_1_started', 'baseline_completed',
    'match_review_completed', 'second_match_review_completed', 'lesson_verdict_recorded'
  ], values.name);
$$;
