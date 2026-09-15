alter table public.seeds
  add column if not exists visual jsonb;

alter table public.plants
  add column if not exists visual jsonb;
