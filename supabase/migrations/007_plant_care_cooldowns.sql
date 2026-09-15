alter table public.plants
  add column if not exists last_watered_at timestamptz,
  add column if not exists last_sunned_at timestamptz;
