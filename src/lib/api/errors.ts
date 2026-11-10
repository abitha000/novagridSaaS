export type BackendErrorKind = 'schema_missing' | 'forbidden' | 'conflict' | 'validation' | 'auth' | 'unknown'

export class BackendError extends Error {
  constructor(message: string, public kind: BackendErrorKind = 'unknown', public code?: string) {
    super(message)
    this.name = 'BackendError'
  }
}

type PgErr = { message: string; code?: string } | null

export function toBackendError(e: NonNullable<PgErr>): BackendError {
  const c = e.code ?? ''
  if (['PGRST205', 'PGRST202', '42P01', '42883'].includes(c))
    return new BackendError('The NOVAGRID database schema is not installed yet. Apply the approved migrations in Supabase first.', 'schema_missing', c)
  if (c === '42501' || c === 'PGRST301') return new BackendError('You do not have permission to do that.', 'forbidden', c)
  if (c === '23505') return new BackendError('That record already exists.', 'conflict', c)
  if (['23514', '23502', '22023', '22P02', '23503', '54000'].includes(c)) return new BackendError(e.message, 'validation', c)
  if (c === '28000') return new BackendError('Please sign in again.', 'auth', c)
  return new BackendError(e.message, 'unknown', c)
}

/** Unwrap a supabase-js response, throwing a typed BackendError. */
export async function run<T>(p: PromiseLike<{ data: T | null; error: PgErr }>): Promise<T> {
  const { data, error } = await p
  if (error) throw toBackendError(error)
  return data as T
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Unexpected error')
