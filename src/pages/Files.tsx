import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as I from 'lucide-react'
import { useAuth } from '../lib/auth'
import { getMySubscription } from '../lib/api/organisations'
import { deleteTenantFile, getExtraStorageGb, listTenantFiles, openTenantFile, uploadTenantFile, type TenantFile } from '../lib/api/storage'
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Skel, useToast } from '../ui'

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 ** 3) return (bytes / 1024 ** 2).toFixed(1) + ' MB'
  return (bytes / 1024 ** 3).toFixed(2) + ' GB'
}
const formatDate = (value: string) => value ? new Date(value).toLocaleString() : '—'

export function FilesPage() {
  const auth = useAuth()
  const tenantId = auth.activeTenantId
  const picker = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const [files, setFiles] = useState<TenantFile[]>([])
  const [limitBytes, setLimitBytes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  const refresh = useCallback(async () => {
    if (!tenantId || auth.backend !== 'live') return
    setLoading(true); setError(null)
    try {
      const [rows, sub] = await Promise.all([listTenantFiles(tenantId), getMySubscription(tenantId)])
      setFiles(rows)
      if (!sub?.plan) setLimitBytes(0)
      else {
        const base = Number(sub.plan.limits?.storage_mb ?? 0) * 1024 * 1024
        const extraGb = await getExtraStorageGb(sub.id)
        setLimitBytes(base + extraGb * 1024 ** 3)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load files and storage usage')
    } finally { setLoading(false) }
  }, [tenantId, auth.backend])

  useEffect(() => { void refresh() }, [refresh, attempt])

  const usedBytes = useMemo(() => files.reduce((n, f) => n + Number(f.metadata?.size ?? 0), 0), [files])
  const percent = limitBytes > 0 ? Math.min(100, usedBytes / limitBytes * 100) : 0

  const upload = async (selected: FileList | null) => {
    if (!selected?.length || !tenantId) return
    setUploading(true); setError(null)
    try {
      for (const file of Array.from(selected)) await uploadTenantFile(tenantId, file)
      toast('File upload completed')
      await refresh()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Upload failed'
      setError(message)
      toast(message, 'err')
    } finally {
      setUploading(false)
      if (picker.current) picker.current.value = ''
    }
  }

  const remove = async (file: TenantFile) => {
    if (!tenantId || !window.confirm('Permanently delete ' + file.name + '?')) return
    setBusyId(file.id); setError(null)
    try { await deleteTenantFile(tenantId, file.name); toast('File deleted'); await refresh() }
    catch (e) { const message = e instanceof Error ? e.message : 'Delete failed'; setError(message); toast(message, 'err') }
    finally { setBusyId(null) }
  }

  if (auth.backend === 'demo') return <><PageHeader title="Files & storage" sub="Private organisation documents" actions={<Badge tone="warn">Demo · Not connected</Badge>} /><Card className="p-5"><EmptyState title="Live storage is not connected" body={auth.backendNote || 'Files become available after the approved Supabase migrations are deployed.'} /></Card></>
  if (!tenantId) return <><PageHeader title="Files & storage" /><Card className="p-5"><EmptyState title="No active organisation" body="Select an approved organisation workspace to manage its files." /></Card></>

  return <>
    <PageHeader title="Files & storage" sub="Private documents for this organisation. Files are never publicly accessible." actions={<Button variant="secondary" size="sm" icon={<I.RefreshCw size={14} />} onClick={() => setAttempt(v => v + 1)} disabled={loading || uploading}>Refresh</Button>} />
    {error && <div className="mb-4"><ErrorState onRetry={() => setAttempt(v => v + 1)} /></div>}
    <Card className="p-5 mb-4">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div><div className="text-sm font-semibold">Storage usage</div><div className="mt-1 text-2xl font-bold">{formatBytes(usedBytes)} <span className="text-sm font-normal text-ng-mute">of {limitBytes ? formatBytes(limitBytes) : 'no active allowance'}</span></div></div>
        <Badge tone={limitBytes && usedBytes >= limitBytes ? 'err' : 'ok'}>{limitBytes ? Math.max(0, 100 - percent).toFixed(0) + '% available' : 'Quota unavailable'}</Badge>
      </div>
      <div className="mt-4 h-2.5 rounded-full bg-ng-canvas overflow-hidden"><div className="h-full rounded-full bg-ng-indigo transition-all" style={{ width: percent + '%' }} /></div>
      <p className="mt-2 text-xs text-ng-mute">Usage is calculated from the files returned by Storage (up to 1,000 items in this view). The database quota trigger remains authoritative.</p>
    </Card>
    <Card>
      <div className="p-4 border-b border-ng-line flex flex-wrap justify-between items-center gap-3"><div><div className="font-semibold">Organisation files</div><div className="text-xs text-ng-mute">{files.length} file(s) listed</div></div>
        <input ref={picker} type="file" multiple className="hidden" onChange={e => void upload(e.target.files)} />
        <Button onClick={() => picker.current?.click()} loading={uploading} disabled={loading || uploading} icon={<I.Upload size={15} />}>Upload files</Button>
      </div>
      {loading ? <div className="p-5 space-y-3"><Skel className="h-12" /><Skel className="h-12" /></div> : files.length === 0 ? <EmptyState title="No files yet" body="Upload a document to this private organisation workspace." /> :
        <div className="divide-y divide-ng-line">{files.map(file => <div key={file.id} className="p-4 flex items-center gap-3">
          <span className="size-10 rounded-xl bg-ng-tint text-ng-indigo-d grid place-items-center shrink-0"><I.FileText size={18} /></span>
          <div className="min-w-0 flex-1"><div className="text-sm font-medium truncate">{file.name}</div><div className="text-xs text-ng-mute">{formatBytes(Number(file.metadata?.size ?? 0))} · {formatDate(file.created_at)}</div></div>
          <Button size="sm" variant="secondary" onClick={() => tenantId && void openTenantFile(tenantId, file.name)}><I.Download size={14} /> Open</Button>
          <Button size="sm" variant="ghost" disabled={busyId === file.id} onClick={() => void remove(file)}><I.Trash2 size={15} /></Button>
        </div>)}
      </div>}
    </Card>
  </>
}
