alter table public.user_profiles
  add column if not exists gender text check (gender in ('male', 'female')),
  add column if not exists travel_style text check (travel_style in ('nature', 'culture', 'activity')),
  add column if not exists avatar_id text check (
    avatar_id in (
      'male_nature', 'male_culture', 'male_activity',
      'female_nature', 'female_culture', 'female_activity'
    )
  );
