-- New Local Garden accounts start with 2,000G.
alter table public.game_states alter column money set default 2000;

-- All current rows are test data created before the initial-gold rule.
update public.game_states
set money = 2000,
    updated_at = now()
where money = 0;
