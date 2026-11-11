import { supabase } from '../supabase'
import { run } from './errors'

export const NOVAGRID_FILES_BUCKET = 'novagrid-files'
export type TenantFile = {
  id: string
  name: string
  created_at: string
  updated_at: string
  metadata: { size?: number; mimetype?: string } | null
}

export async function listTenantFiles(tenantId: string): Promise<TenantFile[]> {
  const files: TenantFile[] = []
  const pageSize = 1000
  let offset = 0

  // Storage limits each list response. Continue until a short page is returned.
  while (true) {
    const { data, error } = await supabase.storage.from(NOVAGRID_FILES_BUCKET)
      .list(`${tenantId}/files`, {
        limit: pageSize,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      })
    if (error) throw new Error(error.message)

    const page = (data ?? []).filter((f) => f.id && f.name).map((f) => ({
      id: f.id!,
      name: f.name,
      created_at: f.created_at ?? '',
      updated_at: f.updated_at ?? '',
      metadata: f.metadata as TenantFile['metadata'],
    }))
    files.push(...page)

    if ((data?.length ?? 0) < pageSize) break
    offset += data!.length
  }

  return files
}

export async function uploadTenantFile(tenantId: string, file: File): Promise<void> {
  const safeName = file.name.normalize('NFKC').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-100) || 'file'
  const path = `${tenantId}/files/${crypto.randomUUID()}-${safeName}`
  const { error } = await supabase.storage.from(NOVAGRID_FILES_BUCKET).upload(path, file, {
    cacheControl: '3600', upsert: false, contentType: file.type || 'application/octet-stream',
  })
  if (error) throw new Error(error.message)
}

export async function deleteTenantFile(tenantId: string, fileName: string): Promise<void> {
  if (!fileName || fileName.includes('/') || fileName === '.' || fileName === '..') throw new Error('Invalid file name')
  const { error } = await supabase.storage.from(NOVAGRID_FILES_BUCKET).remove([`${tenantId}/files/${fileName}`])
  if (error) throw new Error(error.message)
}

export async function openTenantFile(tenantId: string, fileName: string): Promise<void> {
  if (!fileName || fileName.includes('/') || fileName === '.' || fileName === '..') throw new Error('Invalid file name')
  const { data, error } = await supabase.storage.from(NOVAGRID_FILES_BUCKET)
    .createSignedUrl(`${tenantId}/files/${fileName}`, 60)
  if (error) throw new Error(error.message)
  window.location.assign(data.signedUrl)
}

export async function getExtraStorageGb(subscriptionId: string): Promise<number> {
  const rows = await run<{ quantity: number }[]>(
    supabase.from('subscription_addons').select('quantity')
      .eq('subscription_id', subscriptionId).eq('addon_key', 'extra_storage'),
  )
  return rows.reduce((sum, row) => sum + Number(row.quantity || 0) * 5, 0)
}
