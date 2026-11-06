alter table wd_travel_note
  add column if not exists railway_station_name text,
  add column if not exists airport_to_venue_link text,
  add column if not exists airport_to_stay_link text,
  add column if not exists railway_to_venue_link text,
  add column if not exists railway_to_stay_link text;

create or replace function wd_admin_set_travel_note(
  p_token uuid, p_airport_name text, p_road_time text,
  p_railway_station_name text default null,
  p_airport_to_venue_link text default null,
  p_airport_to_stay_link text default null,
  p_railway_to_venue_link text default null,
  p_railway_to_stay_link text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform wd_assert_admin(p_token);
  insert into wd_travel_note (
    id, airport_name, road_time, railway_station_name,
    airport_to_venue_link, airport_to_stay_link, railway_to_venue_link, railway_to_stay_link
  ) values (
    1, p_airport_name, p_road_time, p_railway_station_name,
    p_airport_to_venue_link, p_airport_to_stay_link, p_railway_to_venue_link, p_railway_to_stay_link
  )
  on conflict (id) do update set
    airport_name = excluded.airport_name,
    road_time = excluded.road_time,
    railway_station_name = excluded.railway_station_name,
    airport_to_venue_link = excluded.airport_to_venue_link,
    airport_to_stay_link = excluded.airport_to_stay_link,
    railway_to_venue_link = excluded.railway_to_venue_link,
    railway_to_stay_link = excluded.railway_to_stay_link;
end;
$$;
revoke all on function wd_admin_set_travel_note(uuid, text, text, text, text, text, text, text) from public;
grant execute on function wd_admin_set_travel_note(uuid, text, text, text, text, text, text, text) to anon, authenticated;
