alter table wd_families
  add column if not exists stay_place_name text,
  add column if not exists stay_map_link text;

create or replace function wd_admin_set_family_stay(p_token uuid, p_code text, p_stay_place_name text, p_stay_map_link text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform wd_assert_admin(p_token);
  update wd_families set stay_place_name = p_stay_place_name, stay_map_link = p_stay_map_link where code = lower(trim(p_code));
end;
$$;
revoke all on function wd_admin_set_family_stay(uuid, text, text, text) from public;
grant execute on function wd_admin_set_family_stay(uuid, text, text, text) to anon, authenticated;

create or replace function wd_guest_login(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := lower(trim(p_code));
  v_family wd_families;
  v_result jsonb;
begin
  select * into v_family from wd_families where code = v_code;
  if v_family is null then
    raise exception 'Family code not found.';
  end if;

  select jsonb_build_object(
    'code', v_family.code,
    'family_name', v_family.family_name,
    'stay_place_name', v_family.stay_place_name,
    'stay_map_link', v_family.stay_map_link,
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'name', m.name,
        'room_no', m.room_no,
        'member_code', v_family.code || '/' || m.member_no,
        'remarks', m.remarks,
        'travel', (
          select jsonb_build_object(
            'arrival_date', t.arrival_date, 'arrival_time', t.arrival_time,
            'arrival_mode', t.arrival_mode, 'arrival_number', t.arrival_number,
            'arrival_vehicle_no', t.arrival_vehicle_no, 'arrival_driver_contact', t.arrival_driver_contact,
            'departure_date', t.departure_date, 'departure_time', t.departure_time,
            'departure_mode', t.departure_mode, 'departure_number', t.departure_number,
            'departure_vehicle_no', t.departure_vehicle_no, 'departure_driver_contact', t.departure_driver_contact,
            'notes', t.notes
          ) from wd_travel_details t where t.member_id = m.id
        )
      ) order by m.sort_order, m.name)
      from wd_members m where m.family_code = v_family.code
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

create or replace function wd_admin_list_families(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform wd_assert_admin(p_token);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'code', f.code, 'family_name', f.family_name,
      'stay_place_name', f.stay_place_name, 'stay_map_link', f.stay_map_link,
      'members', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', m.id, 'name', m.name, 'room_no', m.room_no, 'sort_order', m.sort_order,
          'member_code', f.code || '/' || m.member_no, 'remarks', m.remarks
        ) order by m.sort_order, m.name)
        from wd_members m where m.family_code = f.code
      ), '[]'::jsonb)
    ) order by f.created_at desc)
    from wd_families f
  ), '[]'::jsonb);
end;
$$;
