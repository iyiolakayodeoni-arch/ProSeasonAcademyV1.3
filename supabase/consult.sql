-- ═════════════════════════════════════════════════════════════
-- THE PRICING TABLE — deciding it together, and counting it
--
-- Run in Supabase → SQL Editor AFTER access.sql. Safe to re-run.
--
-- THE FOUNDER'S CALL
--   "after the 2 week free trial we discuss the pricing model with
--    them so we are building this together like it's all inclusive
--    and not just for me it's a community"
--
-- WHY THIS IS NOT JUST A CHAT CHANNEL
--   The pricing halls already exist, but chat scatters. Ten people
--   say "too expensive" in ten different ways across three days and
--   there is no number at the end of it — just a feeling, and the
--   loudest voice wins.
--
--   This captures the same conversation as DATA: what would you
--   actually pay, which tier, and why. The founder ends the
--   fortnight with counts and quotes instead of an impression.
--
--   One response per member per question. Editable until the
--   consultation closes, then frozen.
-- ═════════════════════════════════════════════════════════════

-- ── 1 · The questions ────────────────────────────────────────
create table if not exists consult_questions (
  id         bigint generated always as identity primary key,
  slug       text unique not null,
  prompt     text not null,
  helper     text,
  kind       text not null default 'choice',   -- 'choice' | 'price' | 'text'
  options    jsonb,                            -- for 'choice': ["A","B"]
  region     text,                             -- null = everyone
  sort       int not null default 0,
  open       boolean not null default true
);
alter table consult_questions enable row level security;

drop policy if exists consult_q_read on consult_questions;
create policy consult_q_read on consult_questions
  for select to authenticated using (open);

-- ── 2 · The answers ──────────────────────────────────────────
create table if not exists consult_answers (
  question_id bigint not null references consult_questions(id) on delete cascade,
  academy_id  text   not null references profiles(academy_id) on delete cascade,
  choice      text,
  amount      numeric(10,2),
  note        text,
  at          timestamptz not null default now(),
  primary key (question_id, academy_id)        -- one voice, one vote
);
alter table consult_answers enable row level security;

-- a member writes and edits only their own answer
drop policy if exists consult_a_write_own on consult_answers;
create policy consult_a_write_own on consult_answers
  for insert to authenticated
  with check (academy_id in (
    select academy_id from profiles
     where auth_user_id = auth.uid() and status = 'active'
  ));

drop policy if exists consult_a_update_own on consult_answers;
create policy consult_a_update_own on consult_answers
  for update to authenticated
  using (academy_id in (select academy_id from profiles where auth_user_id = auth.uid()))
  with check (academy_id in (select academy_id from profiles where auth_user_id = auth.uid()));

drop policy if exists consult_a_read_own on consult_answers;
create policy consult_a_read_own on consult_answers
  for select to authenticated
  using (academy_id in (select academy_id from profiles where auth_user_id = auth.uid()));

/**
 * Answer, or change your mind. Refused once the question is closed,
 * so nobody can edit their vote after the founder has published the
 * numbers it produced.
 */
create or replace function consult_answer(
  p_slug   text,
  p_choice text default null,
  p_amount numeric default null,
  p_note   text default null
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_academy text;
  v_qid     bigint;
  v_open    boolean;
begin
  select academy_id into v_academy
    from profiles where auth_user_id = auth.uid() and status = 'active';
  if v_academy is null then return false; end if;

  select id, open into v_qid, v_open from consult_questions where slug = p_slug;
  if v_qid is null or not v_open then return false; end if;

  insert into consult_answers (question_id, academy_id, choice, amount, note)
  values (v_qid, v_academy, p_choice, p_amount, left(p_note, 500))
  on conflict (question_id, academy_id) do update
    set choice = excluded.choice,
        amount = excluded.amount,
        note   = excluded.note,
        at     = now();
  return true;
end $$;
grant execute on function consult_answer(text, text, numeric, text) to authenticated;

/** the open questions + whatever this member already said */
create or replace function my_consult()
returns table (slug text, prompt text, helper text, kind text, options jsonb,
               my_choice text, my_amount numeric, my_note text, answered boolean)
language sql security definer stable set search_path = public as $$
  with me as (select academy_id, region from profiles where auth_user_id = auth.uid())
  select q.slug, q.prompt, q.helper, q.kind, q.options,
         a.choice, a.amount, a.note, (a.academy_id is not null)
    from consult_questions q
    cross join me
    left join consult_answers a
           on a.question_id = q.id and a.academy_id = me.academy_id
   where q.open
     and (q.region is null or q.region = me.region)
   order by q.sort, q.id;
$$;
grant execute on function my_consult() to authenticated;

-- ── 3 · The founder's read-out ───────────────────────────────
/**
 * What the fortnight actually produced. Counts for choices, and the
 * median for prices — median, not mean, because two people typing
 * a silly number should not drag the answer.
 */
create or replace function consult_results()
returns jsonb
language sql security definer stable set search_path = public as $$
  select coalesce(jsonb_agg(r order by r->>'slug'), '[]'::jsonb) from (
    select jsonb_build_object(
      'slug',    q.slug,
      'prompt',  q.prompt,
      'kind',    q.kind,
      'region',  q.region,
      'open',    q.open,
      'answers', (select count(*) from consult_answers a where a.question_id = q.id),
      'choices', (
        select coalesce(jsonb_object_agg(c.choice, c.n), '{}'::jsonb)
          from (select choice, count(*) n from consult_answers
                 where question_id = q.id and choice is not null
                 group by choice) c
      ),
      'median',  (
        select percentile_cont(0.5) within group (order by amount)
          from consult_answers where question_id = q.id and amount is not null
      ),
      'low',     (select min(amount) from consult_answers where question_id = q.id and amount is not null),
      'high',    (select max(amount) from consult_answers where question_id = q.id and amount is not null),
      'notes',   (
        select coalesce(jsonb_agg(jsonb_build_object('handle', p.handle, 'note', a.note)
                                  order by a.at desc), '[]'::jsonb)
          from consult_answers a join profiles p on p.academy_id = a.academy_id
         where a.question_id = q.id and a.note is not null and length(trim(a.note)) > 0
         limit 40
      )
    ) as r
    from consult_questions q
  ) s;
$$;
revoke execute on function consult_results() from public, anon, authenticated;
grant execute on function consult_results() to service_role;

-- ── 4 · The questions that matter after the trial ────────────
insert into consult_questions (slug, prompt, helper, kind, options, region, sort) values
  ('worth_it',
   'Two weeks in — did the academy actually make you better?',
   'Be blunt. A polite yes helps nobody.',
   'choice',
   '["MUCH BETTER","A BIT BETTER","NO DIFFERENCE","TOO EARLY TO SAY"]'::jsonb,
   null, 1),

  ('would_pay',
   'Would you pay to keep your seat?',
   'There are 1,000 seats and the academy runs on the people in it.',
   'choice',
   '["YES — PRO","YES — ACADEMY","ONLY IF CHEAPER","NO"]'::jsonb,
   null, 2),

  ('fair_price_ng',
   'What is a FAIR monthly price for ACADEMY, in naira?',
   'Type the number you would genuinely pay each month — not the number you wish it cost.',
   'price', null, 'africa', 3),

  ('fair_price_wd',
   'What is a FAIR monthly price for ACADEMY, in dollars?',
   'Type the number you would genuinely pay each month — not the number you wish it cost.',
   'price', null, 'world', 3),

  ('duration',
   'Which length would you actually buy?',
   'Longer passes cost less per month.',
   'choice',
   '["1 MONTH","3 MONTHS","1 SEASON"]'::jsonb,
   null, 4),

  ('most_valuable',
   'Which part is worth paying for?',
   'The honest answer tells the founder what to build more of.',
   'choice',
   '["THE JOURNEY","THE COACH + FILM ROOM","THE MATCH SCAN","THE TRICKS","THE COMMUNITY"]'::jsonb,
   null, 5),

  ('missing',
   'What is missing, or what would you change?',
   'One thing. The clearer you are, the more likely it gets built.',
   'text', null, null, 6)
on conflict (slug) do nothing;

-- ── 5 · Proof ────────────────────────────────────────────────
do $$
declare v_q int; v_a int;
begin
  select count(*) into v_q from consult_questions where open;
  select count(*) into v_a from consult_answers;
  raise notice 'PRICING TABLE ARMED · % open question(s) · % answer(s) so far', v_q, v_a;
  raise notice '  members answer in COMMUNITY → THE PRICING TABLE';
  raise notice '  founder reads: select consult_results();  (or the Desk)';
  raise notice '  close it with: update consult_questions set open = false;';
end $$;
