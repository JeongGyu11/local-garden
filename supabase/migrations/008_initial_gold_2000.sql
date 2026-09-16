-- New Local Garden accounts start with 2,000G.
-- Existing accounts keep their current balance.
alter table public.game_states alter column money set default 2000;
