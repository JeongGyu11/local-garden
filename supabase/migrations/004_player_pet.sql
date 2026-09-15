alter table public.user_profiles
  add column if not exists pet_id text check (
    pet_id in ('meerkat', 'capybara', 'panda')
  );
