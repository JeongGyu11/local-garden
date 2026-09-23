-- One-time notice rewards that remain available to both existing and future users.
create table if not exists public.notice_reward_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  notice_id text not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, notice_id)
);

alter table public.notice_reward_claims enable row level security;

create or replace function public.claim_dungeon_launch_notice_reward()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_inserted_count integer := 0;
  v_money integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.game_states (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  insert into public.notice_reward_claims (user_id, notice_id)
  values (v_user_id, 'dungeon-launch-2026-09')
  on conflict (user_id, notice_id) do nothing;
  get diagnostics v_inserted_count = row_count;

  if v_inserted_count = 0 then
    select money into v_money
    from public.game_states
    where user_id = v_user_id;

    return jsonb_build_object(
      'claimed', false,
      'alreadyClaimed', true,
      'money', v_money
    );
  end if;

  update public.game_states
  set
    money = money + 1000,
    settings = settings || jsonb_build_object('dungeonLaunchGiftClaimed', true),
    updated_at = now()
  where user_id = v_user_id
  returning money into v_money;

  return jsonb_build_object(
    'claimed', true,
    'alreadyClaimed', false,
    'money', v_money
  );
end;
$$;

revoke all on function public.claim_dungeon_launch_notice_reward() from public;
grant execute on function public.claim_dungeon_launch_notice_reward() to authenticated;
