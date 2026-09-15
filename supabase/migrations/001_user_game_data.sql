-- Local Garden: authenticated, per-user game data
-- The current prototype tables were confirmed empty on 2026-09-15.
-- Reset them so text user IDs can be replaced by auth.users UUIDs.

drop table if exists public.coupons cascade;
drop table if exists public.encyclopedia cascade;
drop table if exists public.visited_spots cascade;
drop table if exists public.seeds cascade;
drop table if exists public.plants cascade;
drop table if exists public.game_states cascade;
drop table if exists public.user_profiles cascade;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default '로컬 정원사',
  level integer not null default 1 check (level >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  money integer not null default 0 check (money >= 0),
  harvested_crops jsonb not null default '[]'::jsonb,
  farm_layout jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{"dpadScale":1}'::jsonb,
  check_in_cooldowns jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.plants (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  species text not null,
  region text not null,
  emoji text not null,
  growth_stage integer not null default 0 check (growth_stage between 0 and 4),
  water_progress integer not null default 0 check (water_progress between 0 and 100),
  sun_progress integer not null default 0 check (sun_progress between 0 and 100),
  harvest_reward text not null,
  plot_index integer check (plot_index between 0 and 3),
  primary key (user_id, id)
);

create table if not exists public.seeds (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  region text not null,
  emoji text not null,
  description text not null,
  primary key (user_id, id)
);

create table if not exists public.visited_spots (
  user_id uuid not null references auth.users(id) on delete cascade,
  spot_id text not null,
  spot_title text not null,
  region text not null,
  visited_at timestamptz not null default now(),
  primary key (user_id, spot_id)
);

create table if not exists public.encyclopedia (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  crop_name text not null,
  region text not null,
  emoji text not null,
  is_discovered boolean not null default false,
  harvest_count integer not null default 0 check (harvest_count >= 0),
  story text not null,
  specialty_point text not null,
  primary key (user_id, id)
);

create table if not exists public.coupons (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  title text not null,
  brand text not null,
  discount text not null,
  source_crop text not null,
  region text not null,
  expiry_date text not null,
  used boolean not null default false,
  code text not null,
  primary key (user_id, id)
);

alter table public.user_profiles enable row level security;
alter table public.game_states enable row level security;
alter table public.plants enable row level security;
alter table public.seeds enable row level security;
alter table public.visited_spots enable row level security;
alter table public.encyclopedia enable row level security;
alter table public.coupons enable row level security;

create policy "users_manage_own_profile" on public.user_profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "users_manage_own_game_state" on public.game_states
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users_manage_own_plants" on public.plants
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users_manage_own_seeds" on public.seeds
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users_manage_own_visited_spots" on public.visited_spots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users_manage_own_encyclopedia" on public.encyclopedia
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users_manage_own_coupons" on public.coupons
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.user_profiles (id, nickname)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '로컬 정원사')
  )
  on conflict (id) do nothing;

  insert into public.game_states (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();
