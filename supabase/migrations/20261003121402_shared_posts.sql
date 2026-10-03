create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  legacy_id text,
  payload jsonb not null,
  revision integer not null default 1 check (revision > 0),
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  unique (owner_id, legacy_id),
  constraint post_payload_valid check (
    payload ?& array['title','bodyText','bodyHtml','images','tags']
    and jsonb_typeof(payload) = 'object'
    and jsonb_typeof(payload->'title') = 'string'
    and length(trim(payload->>'title')) between 1 and 100
    and jsonb_typeof(payload->'bodyText') = 'string'
    and length(trim(payload->>'bodyText')) between 1 and 20000
    and jsonb_typeof(payload->'bodyHtml') = 'string'
    and length(payload->>'bodyHtml') <= 100000
    and jsonb_typeof(payload->'images') = 'array'
    and jsonb_array_length(payload->'images') <= 3
    and jsonb_typeof(payload->'tags') = 'array'
    and jsonb_array_length(payload->'tags') <= 10
    and octet_length(payload::text) <= 2000000
  )
);
create index community_posts_feed on public.community_posts (created_at desc, id) where not deleted;
alter table public.community_posts enable row level security;
revoke all on public.community_posts from anon, authenticated;
grant select on public.community_posts to anon, authenticated;
grant insert, update on public.community_posts to authenticated;
create policy "read published posts or own tombstones" on public.community_posts for select to anon, authenticated
  using (not deleted or owner_id = (select auth.uid()));
create policy "account owner creates posts" on public.community_posts for insert to authenticated
  with check (owner_id = (select auth.uid()) and coalesce((select auth.jwt()->>'is_anonymous'),'false') = 'false');
create policy "account owner updates posts" on public.community_posts for update to authenticated
  using (owner_id = (select auth.uid()) and coalesce((select auth.jwt()->>'is_anonymous'),'false') = 'false')
  with check (owner_id = (select auth.uid()) and coalesce((select auth.jwt()->>'is_anonymous'),'false') = 'false');

-- Only explicit publish/migration uploads enter this public bucket; drafts stay on the device.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('post-media','post-media',true,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm']);
create policy "owners upload published media" on storage.objects for insert to authenticated
  with check (bucket_id='post-media' and (storage.foldername(name))[1]=(select auth.uid())::text
    and coalesce((select auth.jwt()->>'is_anonymous'),'false')='false');
create policy "owners inspect their media" on storage.objects for select to authenticated
  using (bucket_id='post-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
-- No overwrite or delete policy: unique object paths protect older published revisions.
