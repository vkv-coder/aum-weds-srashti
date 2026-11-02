-- Aum weds Srashti - gallery storage bucket.
-- Open read+insert scoped strictly to this one bucket (wd-gallery) - the
-- gallery is deliberately "any guest can snap a photo and everyone sees
-- it instantly", so there's no per-guest write restriction here, same as
-- the public SELECT already granted on wd_itinerary/wd_announcements.
-- Policies are scoped to bucket_id = 'wd-gallery' only, never touching any
-- other app's bucket on this shared project.

insert into storage.buckets (id, name, public)
values ('wd-gallery', 'wd-gallery', true)
on conflict (id) do nothing;

drop policy if exists wd_gallery_public_read on storage.objects;
create policy wd_gallery_public_read on storage.objects
  for select using (bucket_id = 'wd-gallery');

drop policy if exists wd_gallery_public_upload on storage.objects;
create policy wd_gallery_public_upload on storage.objects
  for insert with check (bucket_id = 'wd-gallery');

-- Deliberately NO delete policy for anon/authenticated here - photo
-- deletion is admin-only and goes through the wd-admin-delete-photo Edge
-- Function (service role), not the client-side storage API. Granting an
-- open delete policy would let any guest delete anyone's photo directly.
