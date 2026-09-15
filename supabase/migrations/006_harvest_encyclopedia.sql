alter table public.encyclopedia
  add column if not exists visual jsonb,
  add column if not exists seed_name text,
  add column if not exists first_harvested_at timestamptz,
  add column if not exists last_harvested_at timestamptz;
