-- Tighten Storage mutation policies: members may read their own tenant's
-- files, but updates/deletes require a writable organisation subscription.
-- The quota trigger remains the final authority for upload/metadata size.

drop policy if exists novagrid_storage_update on storage.objects;
create policy novagrid_storage_update on storage.objects
for update to authenticated
using (
  bucket_id = 'novagrid-files'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and private.is_tenant_member(split_part(name, '/', 1)::uuid)
  and private.is_writable(split_part(name, '/', 1)::uuid)
)
with check (
  bucket_id = 'novagrid-files'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and private.is_tenant_member(split_part(name, '/', 1)::uuid)
  and private.is_writable(split_part(name, '/', 1)::uuid)
);

drop policy if exists novagrid_storage_delete on storage.objects;
create policy novagrid_storage_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'novagrid-files'
  and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and private.is_tenant_member(split_part(name, '/', 1)::uuid)
  and private.is_writable(split_part(name, '/', 1)::uuid)
);
