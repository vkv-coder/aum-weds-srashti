create table if not exists wd_meals (
  id uuid primary key default gen_random_uuid(),
  meal_name text not null,
  meal_date date,
  meal_time time,
  venue text,
  details text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table wd_meals enable row level security;

drop policy if exists wd_meals_read on wd_meals;
create policy wd_meals_read on wd_meals for select using (true);
revoke insert, update, delete on wd_meals from anon, authenticated;
grant select on wd_meals to anon, authenticated;

create or replace function wd_admin_upsert_meal(
  p_token uuid, p_id uuid, p_meal_name text, p_meal_date date,
  p_meal_time time, p_venue text, p_details text, p_sort_order int
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform wd_assert_admin(p_token);
  if p_id is null then
    insert into wd_meals (meal_name, meal_date, meal_time, venue, details, sort_order)
    values (p_meal_name, p_meal_date, p_meal_time, p_venue, p_details, coalesce(p_sort_order, 0))
    returning id into v_id;
  else
    update wd_meals set
      meal_name = p_meal_name, meal_date = p_meal_date, meal_time = p_meal_time,
      venue = p_venue, details = p_details, sort_order = coalesce(p_sort_order, sort_order)
    where id = p_id
    returning id into v_id;
  end if;
  return v_id;
end;
$$;
revoke all on function wd_admin_upsert_meal(uuid, uuid, text, date, time, text, text, int) from public;
grant execute on function wd_admin_upsert_meal(uuid, uuid, text, date, time, text, text, int) to anon, authenticated;

create or replace function wd_admin_delete_meal(p_token uuid, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform wd_assert_admin(p_token);
  delete from wd_meals where id = p_id;
end;
$$;
revoke all on function wd_admin_delete_meal(uuid, uuid) from public;
grant execute on function wd_admin_delete_meal(uuid, uuid) to anon, authenticated;
