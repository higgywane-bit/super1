-- =====================================================================================
-- SUPER1 · storage buckets (docs/03-DATA-MODEL.md, "Storage buckets")
--
--   signatures  private  waiver signature PNGs, signatures/<signup id>.png (desk and Pete read)
--   menu        public   menu photos
--   coaches     public   coach photos
--   exercises   public   exercise videos and stills
--   brand       public   logos, QR stand poster
--
-- Uploads to `signatures` go through a server function with the service role (the counter QR has
-- no login). Pete uploads to the public buckets from the admin. Nothing is ever deleted: there is
-- no delete policy on storage.objects for anon or authenticated.
-- Skipped on plain Postgres (npm run db:test), where the storage schema doesn't exist.
-- =====================================================================================

do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage')
     or not exists (select 1 from pg_tables where schemaname = 'storage' and tablename = 'buckets') then
    raise notice 'storage schema not present: skipping buckets';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
    ('signatures', 'signatures', false, 1048576, array['image/png']),
    ('menu', 'menu', true, 10485760, array['image/png', 'image/jpeg', 'image/webp']),
    ('coaches', 'coaches', true, 10485760, array['image/png', 'image/jpeg', 'image/webp']),
    ('exercises', 'exercises', true, 52428800, array['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm']),
    ('brand', 'brand', true, 20971520, array['image/png', 'image/jpeg', 'image/svg+xml', 'application/pdf'])
  on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

  -- Desk and Pete can see waiver signatures. Nobody but the server writes them.
  execute $p$create policy signatures_read on storage.objects for select to authenticated
    using (bucket_id = 'signatures' and public.is_desk_or_admin())$p$;
  -- Pete manages the public buckets from the admin.
  execute $p$create policy public_buckets_admin_insert on storage.objects for insert to authenticated
    with check (bucket_id in ('menu', 'coaches', 'exercises', 'brand') and public.is_admin())$p$;
  execute $p$create policy public_buckets_admin_update on storage.objects for update to authenticated
    using (bucket_id in ('menu', 'coaches', 'exercises', 'brand') and public.is_admin())
    with check (bucket_id in ('menu', 'coaches', 'exercises', 'brand') and public.is_admin())$p$;
end $$;
