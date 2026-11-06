create table if not exists wd_travel_routes (
  id uuid primary key default gen_random_uuid(),
  from_place text not null,
  train_no text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists wd_travel_note (
  id int primary key default 1,
  airport_name text,
  road_time text,
  constraint wd_travel_note_single_row check (id = 1)
);

alter table wd_travel_routes enable row level security;
alter table wd_travel_note enable row level security;

drop policy if exists wd_travel_routes_read on wd_travel_routes;
create policy wd_travel_routes_read on wd_travel_routes for select using (true);
revoke insert, update, delete on wd_travel_routes from anon, authenticated;

drop policy if exists wd_travel_note_read on wd_travel_note;
create policy wd_travel_note_read on wd_travel_note for select using (true);
revoke insert, update, delete on wd_travel_note from anon, authenticated;

grant select on wd_travel_routes, wd_travel_note to anon, authenticated;

create or replace function wd_admin_upsert_travel_route(p_token uuid, p_id uuid, p_from_place text, p_train_no text, p_sort_order int)
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
    insert into wd_travel_routes (from_place, train_no, sort_order)
    values (p_from_place, p_train_no, coalesce(p_sort_order, 0))
    returning id into v_id;
  else
    update wd_travel_routes set
      from_place = p_from_place, train_no = p_train_no, sort_order = coalesce(p_sort_order, sort_order)
    where id = p_id
    returning id into v_id;
  end if;
  return v_id;
end;
$$;
revoke all on function wd_admin_upsert_travel_route(uuid, uuid, text, text, int) from public;
grant execute on function wd_admin_upsert_travel_route(uuid, uuid, text, text, int) to anon, authenticated;

create or replace function wd_admin_delete_travel_route(p_token uuid, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform wd_assert_admin(p_token);
  delete from wd_travel_routes where id = p_id;
end;
$$;
revoke all on function wd_admin_delete_travel_route(uuid, uuid) from public;
grant execute on function wd_admin_delete_travel_route(uuid, uuid) to anon, authenticated;

create or replace function wd_admin_set_travel_note(p_token uuid, p_airport_name text, p_road_time text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform wd_assert_admin(p_token);
  insert into wd_travel_note (id, airport_name, road_time) values (1, p_airport_name, p_road_time)
  on conflict (id) do update set airport_name = excluded.airport_name, road_time = excluded.road_time;
end;
$$;
revoke all on function wd_admin_set_travel_note(uuid, text, text) from public;
grant execute on function wd_admin_set_travel_note(uuid, text, text) to anon, authenticated;

insert into wd_travel_note (id, airport_name, road_time) values (1, 'Indore', '5 hrs 30 min road journey from Indore to Mandsaur')
on conflict (id) do update set airport_name = excluded.airport_name, road_time = excluded.road_time;

insert into wd_travel_routes (from_place, train_no, sort_order)
select v.from_place, v.train_no, v.sort_order
from (values
  ('Mumbai', '22901 / 20667 / 09001 / 19668 / 12995', 0),
  ('Ahmedabad', '19316', 1),
  ('Vadodara', '22901 / 20667 / 09001 / 19668 / 12995', 2)
) as v(from_place, train_no, sort_order)
where not exists (select 1 from wd_travel_routes);
