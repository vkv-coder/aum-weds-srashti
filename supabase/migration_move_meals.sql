begin;

insert into wd_meals (meal_name, meal_date, meal_time, venue, sort_order)
select
  initcap(event_name),
  event_date,
  start_time,
  venue,
  row_number() over (order by event_date, start_time) - 1
from wd_itinerary
where lower(event_name) in ('breakfast', 'lunch', 'high tea', 'dinner at sangeet', 'wedding lunch', 'dinner');

delete from wd_itinerary
where lower(event_name) in ('breakfast', 'lunch', 'high tea', 'dinner at sangeet', 'wedding lunch', 'dinner');

commit;
