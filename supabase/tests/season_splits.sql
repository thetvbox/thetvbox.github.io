-- Run: psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/season_splits.sql
-- Everything runs in one transaction that is rolled back.
begin;

create function pg_temp.expect(label text, actual anyelement, expected anyelement) returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL %: expected %, got %', label, expected, actual;
  end if;
  raise notice 'PASS %', label;
end $$;

-- Lupin-style: TMDB season 1 is two streamer seasons of 5, then TMDB seasons 2 and 3 follow one to one.
select pg_temp.expect('split episode 7 of TMDB season 1 is season 2 episode 2',
  (select row(season, episode)::text from public.season_split_to_display('[{"tmdb_season":1,"part_sizes":[5,5]}]', 1, 7)), '(2,2)');
select pg_temp.expect('the first part keeps its numbers',
  (select row(season, episode)::text from public.season_split_to_display('[{"tmdb_season":1,"part_sizes":[5,5]}]', 1, 5)), '(1,5)');
select pg_temp.expect('later TMDB seasons shift up by the extra parts',
  (select row(season, episode)::text from public.season_split_to_display('[{"tmdb_season":1,"part_sizes":[5,5]}]', 3, 8)), '(4,8)');
select pg_temp.expect('episodes beyond the split land in its last part',
  (select row(season, episode)::text from public.season_split_to_display('[{"tmdb_season":1,"part_sizes":[5,5]}]', 1, 12)), '(2,7)');
select pg_temp.expect('seasons before a split are untouched',
  (select row(season, episode)::text from public.season_split_to_display('[{"tmdb_season":2,"part_sizes":[3,4]}]', 1, 9)), '(1,9)');
select pg_temp.expect('to_tmdb undoes a split part',
  (select row(season, episode)::text from public.season_split_to_tmdb('[{"tmdb_season":1,"part_sizes":[5,5]}]', 2, 2)), '(1,7)');
select pg_temp.expect('to_tmdb undoes the shift after a split',
  (select row(season, episode)::text from public.season_split_to_tmdb('[{"tmdb_season":1,"part_sizes":[5,5]}]', 4, 8)), '(3,8)');
select pg_temp.expect('to_tmdb with two splits',
  (select row(season, episode)::text from public.season_split_to_tmdb('[{"tmdb_season":1,"part_sizes":[5,5]},{"tmdb_season":3,"part_sizes":[2,2,2]}]', 6, 1)), '(3,5)');
select pg_temp.expect('no splits is the identity',
  (select row(season, episode)::text from public.season_split_to_tmdb('[]', 3, 4)), '(3,4)');

insert into auth.users (id, aud, role, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000003a1', 'authenticated', 'authenticated', 'split-ada@test.dev', now()),
  ('00000000-0000-0000-0000-0000000003a2', 'authenticated', 'authenticated', 'split-bob@test.dev', now()),
  ('00000000-0000-0000-0000-0000000003a9', 'authenticated', 'authenticated', 'split-nobody@test.dev', now());
insert into public.users (id, email, username) values
  ('00000000-0000-0000-0000-0000000003b1', 'split-ada@test.dev', 'split_ada'),
  ('00000000-0000-0000-0000-0000000003b2', 'split-bob@test.dev', 'split_bob');
insert into public.user_auth_links (auth_user_id, user_id, provider) values
  ('00000000-0000-0000-0000-0000000003a1', '00000000-0000-0000-0000-0000000003b1', 'passkey'),
  ('00000000-0000-0000-0000-0000000003a2', '00000000-0000-0000-0000-0000000003b2', 'passkey');
insert into public.follows (follower_id, followed_id) values
  ('00000000-0000-0000-0000-0000000003b2', '00000000-0000-0000-0000-0000000003b1');

-- Ada watched all 25 episodes in TMDB numbering (10, 7, 8) and rated TMDB seasons 1 and 3.
insert into public.episode_watched (user_id, show_id, show_name, show_total_episodes, season_number, episode_number, watched_at)
select '00000000-0000-0000-0000-0000000003b1', 999999901, 'Lupin', 25, s, e, now()
from (values (1, 10), (2, 7), (3, 8)) seasons(s, n), generate_series(1, n) e;
insert into public.season_ratings (user_id, show_id, show_name, season_number, season_name, rating) values
  ('00000000-0000-0000-0000-0000000003b1', 999999901, 'Lupin', 1, 'Season 1', 4),
  ('00000000-0000-0000-0000-0000000003b1', 999999901, 'Lupin', 3, 'Part 4', 5);
delete from public.notifications where show_id = 999999901;

do $$
declare
  failed boolean := false;
begin
  -- Someone without an account can't record splits.
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000003a9","role":"authenticated"}', true);
  set local role authenticated;
  begin
    perform public.record_season_splits(999999901, '[{"tmdb_season":1,"part_sizes":[5,5]}]');
  exception when insufficient_privilege then
    failed := true;
  end;
  reset role;
  perform pg_temp.expect('a login without an account cannot record splits', failed, true);

  -- Members can't write the table directly.
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000003a2","role":"authenticated"}', true);
  set local role authenticated;
  failed := false;
  begin
    insert into public.season_splits (show_id, tmdb_season, part_sizes) values (1, 1, '{1,1}');
  exception when insufficient_privilege then
    failed := true;
  end;
  perform pg_temp.expect('members cannot insert splits directly', failed, true);

  -- Bob records Lupin's split; Ada's log is renumbered for everyone.
  perform public.record_season_splits(999999901, '[{"tmdb_season":1,"part_sizes":[5,5]}]');
  perform pg_temp.expect('members can read splits', (select count(*) from public.season_splits where show_id = 999999901), 1::bigint);
  reset role;
end $$;

select pg_temp.expect('the log now has four seasons of 5, 5, 7 and 8',
  (select string_agg(n::text, ',' order by s) from (select season_number s, count(*) n from public.episode_watched where show_id = 999999901 group by 1) x),
  '5,5,7,8');
select pg_temp.expect('TMDB season 1 episode 6 became season 2 episode 1',
  (select count(*) from public.episode_watched where show_id = 999999901 and season_number = 2 and episode_number = 1), 1::bigint);
select pg_temp.expect('season ratings follow the renumbering',
  (select string_agg(season_number || ':' || season_name, ',' order by season_number) from public.season_ratings where show_id = 999999901),
  '1:Season 1,4:Season 4');
select pg_temp.expect('renumbering a finished show tells no followers',
  (select count(*) from public.notifications where show_id = 999999901), 0::bigint);

-- Recording the same split again changes nothing; a new split later renumbers from the current numbering.
select public.record_season_splits(999999901, '[{"tmdb_season":1,"part_sizes":[5,5]}]')
from (select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000003a1","role":"authenticated"}', true)) c;
select pg_temp.expect('recording a known split again keeps the numbering',
  (select string_agg(n::text, ',' order by s) from (select season_number s, count(*) n from public.episode_watched where show_id = 999999901 group by 1) x),
  '5,5,7,8');
select public.record_season_splits(999999901, '[{"tmdb_season":1,"part_sizes":[9,9]},{"tmdb_season":3,"part_sizes":[4,4]}]');
select pg_temp.expect('a known split is never changed, and a new one splits the last season',
  (select string_agg(n::text, ',' order by s) from (select season_number s, count(*) n from public.episode_watched where show_id = 999999901 group by 1) x),
  '5,5,7,4,4');

rollback;
