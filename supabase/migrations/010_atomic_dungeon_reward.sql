-- Award the first dungeon-clear reward exactly once and atomically.
create table if not exists public.dungeon_reward_claims (
  user_id uuid primary key references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now()
);

alter table public.dungeon_reward_claims enable row level security;

-- Preserve claims made by builds that stored the flag inside game_states.settings.
insert into public.dungeon_reward_claims (user_id)
select user_id
from public.game_states
where coalesce((settings ->> 'hasClaimedDungeonReward')::boolean, false)
on conflict (user_id) do nothing;

create or replace function public.claim_dungeon_first_clear_reward()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_inserted_count integer := 0;
  v_seed_one_id text := 'dungeon_rainbow_' || replace(gen_random_uuid()::text, '-', '');
  v_seed_two_id text := 'dungeon_rainbow_' || replace(gen_random_uuid()::text, '-', '');
  v_diamond_one_id text := 'gem_diamond_' || replace(gen_random_uuid()::text, '-', '');
  v_diamond_two_id text := 'gem_diamond_' || replace(gen_random_uuid()::text, '-', '');
  v_amethyst_one_id text := 'gem_amethyst_' || replace(gen_random_uuid()::text, '-', '');
  v_amethyst_two_id text := 'gem_amethyst_' || replace(gen_random_uuid()::text, '-', '');
  v_seed_visual jsonb := jsonb_build_object(
    'theme', 'festival',
    'primaryColor', '#EC4899',
    'secondaryColor', '#3B82F6',
    'accentColor', '#FACC15',
    'pattern', 'sparkle'
  );
  v_gems jsonb;
  v_game_state public.game_states%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.game_states (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  insert into public.dungeon_reward_claims (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;
  get diagnostics v_inserted_count = row_count;

  if v_inserted_count = 0 then
    select * into v_game_state
    from public.game_states
    where user_id = v_user_id;

    return jsonb_build_object(
      'claimed', false,
      'alreadyClaimed', true,
      'money', v_game_state.money,
      'harvestedCrops', v_game_state.harvested_crops
    );
  end if;

  insert into public.seeds (user_id, id, name, region, emoji, description, visual)
  values
    (v_user_id, v_seed_one_id, '전설의 무지개 씨앗', '지하 신비', '🌈',
      '지하 무지개 샘물에서 자란 전설의 씨앗. 수확 시 1,000G 수익!', v_seed_visual),
    (v_user_id, v_seed_two_id, '전설의 무지개 씨앗', '지하 신비', '🌈',
      '지하 무지개 샘물에서 자란 전설의 씨앗. 수확 시 1,000G 수익!', v_seed_visual);

  v_gems := jsonb_build_array(
    jsonb_build_object(
      'id', v_diamond_one_id, 'name', '고대 황금 다이아몬드', 'region', '지하 심연',
      'emoji', '💠', 'visual', jsonb_build_object('theme', 'festival', 'primaryColor', '#38BDF8', 'secondaryColor', '#7DD3FC', 'accentColor', '#F0F9FF', 'pattern', 'sparkle'),
      'harvestedAt', now()::text
    ),
    jsonb_build_object(
      'id', v_diamond_two_id, 'name', '고대 황금 다이아몬드', 'region', '지하 심연',
      'emoji', '💠', 'visual', jsonb_build_object('theme', 'festival', 'primaryColor', '#38BDF8', 'secondaryColor', '#7DD3FC', 'accentColor', '#F0F9FF', 'pattern', 'sparkle'),
      'harvestedAt', now()::text
    ),
    jsonb_build_object(
      'id', v_amethyst_one_id, 'name', '지하 신비 자수정', 'region', '지하 심연',
      'emoji', '💎', 'visual', jsonb_build_object('theme', 'art', 'primaryColor', '#A855F7', 'secondaryColor', '#C084FC', 'accentColor', '#F3E8FF', 'pattern', 'sparkle'),
      'harvestedAt', now()::text
    ),
    jsonb_build_object(
      'id', v_amethyst_two_id, 'name', '지하 신비 자수정', 'region', '지하 심연',
      'emoji', '💎', 'visual', jsonb_build_object('theme', 'art', 'primaryColor', '#A855F7', 'secondaryColor', '#C084FC', 'accentColor', '#F3E8FF', 'pattern', 'sparkle'),
      'harvestedAt', now()::text
    )
  );

  update public.game_states
  set
    money = money + 5000,
    harvested_crops = v_gems || harvested_crops,
    settings = settings || jsonb_build_object('hasClaimedDungeonReward', true),
    updated_at = now()
  where user_id = v_user_id
  returning * into v_game_state;

  return jsonb_build_object(
    'claimed', true,
    'alreadyClaimed', false,
    'money', v_game_state.money,
    'harvestedCrops', v_game_state.harvested_crops,
    'rewardSeeds', jsonb_build_array(
      jsonb_build_object('id', v_seed_one_id, 'name', '전설의 무지개 씨앗', 'region', '지하 신비', 'emoji', '🌈', 'description', '지하 무지개 샘물에서 자란 전설의 씨앗. 수확 시 1,000G 수익!', 'visual', v_seed_visual),
      jsonb_build_object('id', v_seed_two_id, 'name', '전설의 무지개 씨앗', 'region', '지하 신비', 'emoji', '🌈', 'description', '지하 무지개 샘물에서 자란 전설의 씨앗. 수확 시 1,000G 수익!', 'visual', v_seed_visual)
    )
  );
end;
$$;

revoke all on function public.claim_dungeon_first_clear_reward() from public;
grant execute on function public.claim_dungeon_first_clear_reward() to authenticated;
