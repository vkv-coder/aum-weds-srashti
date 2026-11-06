alter table wd_itinerary
  add column if not exists map_link text,
  add column if not exists coordinator_name text,
  add column if not exists coordinator_phone text;

create or replace function wd_admin_upsert_itinerary(
  p_token uuid, p_id uuid, p_event_name text, p_event_date date,
  p_start_time time, p_end_time time, p_venue text, p_menu text, p_dress_code text, p_sort_order int,
  p_map_link text default null, p_coordinator_name text default null, p_coordinator_phone text default null
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
    insert into wd_itinerary (event_name, event_date, start_time, end_time, venue, menu, dress_code, sort_order, map_link, coordinator_name, coordinator_phone)
    values (p_event_name, p_event_date, p_start_time, p_end_time, p_venue, p_menu, p_dress_code, coalesce(p_sort_order, 0), p_map_link, p_coordinator_name, p_coordinator_phone)
    returning id into v_id;
  else
    update wd_itinerary set
      event_name = p_event_name, event_date = p_event_date, start_time = p_start_time, end_time = p_end_time,
      venue = p_venue, menu = p_menu, dress_code = p_dress_code, sort_order = coalesce(p_sort_order, sort_order),
      map_link = p_map_link, coordinator_name = p_coordinator_name, coordinator_phone = p_coordinator_phone
    where id = p_id
    returning id into v_id;
  end if;
  return v_id;
end;
$$;
revoke all on function wd_admin_upsert_itinerary(uuid, uuid, text, date, time, time, text, text, text, int, text, text, text) from public;
grant execute on function wd_admin_upsert_itinerary(uuid, uuid, text, date, time, time, text, text, text, int, text, text, text) to anon, authenticated;
