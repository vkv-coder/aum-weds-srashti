create or replace function wd_guest_add_member(p_code text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := lower(trim(p_code));
  v_id uuid;
  v_next_sort int;
  v_next_member_no int;
  v_name text := trim(p_name);
begin
  if not exists (select 1 from wd_families where code = v_code) then
    raise exception 'Family code not found.';
  end if;
  if v_name = '' then
    raise exception 'Name is required.';
  end if;
  select coalesce(max(sort_order) + 1, 0), coalesce(max(member_no) + 1, 1)
    into v_next_sort, v_next_member_no
    from wd_members where family_code = v_code;
  insert into wd_members (family_code, name, sort_order, member_no)
    values (v_code, v_name, v_next_sort, v_next_member_no)
    returning id into v_id;
  return jsonb_build_object(
    'id', v_id, 'name', v_name, 'room_no', null, 'remarks', null,
    'member_code', v_code || '/' || v_next_member_no, 'travel', null
  );
end;
$$;
revoke all on function wd_guest_add_member(text, text) from public;
grant execute on function wd_guest_add_member(text, text) to anon, authenticated;
