import type { ContactInput } from './api/contacts'

export type CsvContactRow = ContactInput & { rowNumber: number; errors: string[] }
const normalizeHeader = (value: string) => value.trim().toLowerCase().replace(/[\\s-]+/g, '_')

/** Small RFC-4180-style parser supporting quoted commas, escaped quotes and newlines. */
export function parseCsv(source: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') { cell += '"'; i += 1 }
      else if (char === '"') quoted = false
      else cell += char
    } else if (char === '"' && cell.length === 0) quoted = true
    else if (char === ',') { row.push(cell); cell = '' }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i += 1
      row.push(cell); cell = ''
      if (row.some((value) => value.trim())) rows.push(row)
      row = []
    } else cell += char
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field.')
  row.push(cell)
  if (row.some((value) => value.trim())) rows.push(row)
  return rows
}

export function parseContactsCsv(source: string): CsvContactRow[] {
  const rows = parseCsv(source.replace(/^\\uFEFF/, ''))
  if (rows.length < 2) throw new Error('CSV must include a header and at least one contact row.')
  const headers = rows[0].map(normalizeHeader)
  const nameIndex = headers.findIndex((h) => ['full_name', 'name', 'contact_name'].includes(h))
  if (nameIndex < 0) throw new Error('CSV needs a full_name or name column.')
  const index = (keys: string[]) => headers.findIndex((h) => keys.includes(h))
  const typeIndex = index(['type', 'contact_type'])
  const phoneIndex = index(['phone_e164', 'phone', 'mobile', 'mobile_number'])
  const emailIndex = index(['email', 'email_address'])
  return rows.slice(1).map((values, offset) => {
    const get = (i: number) => i < 0 ? '' : (values[i] ?? '').trim()
    const full_name = get(nameIndex)
    const phone_e164 = get(phoneIndex).replace(/[\\s()-]/g, '')
    const email = get(emailIndex)
    const errors: string[] = []
    if (full_name.length < 2) errors.push('Name must be at least 2 characters')
    if (phone_e164 && !/^\\+[1-9]\\d{7,14}$/.test(phone_e164)) errors.push('Phone must use international format, e.g. +919876543210')
    if (email && !/^\\S+@\\S+\\.\\S+$/.test(email)) errors.push('Email is invalid')
    return { rowNumber: offset + 2, type: get(typeIndex) || 'person', full_name, phone_e164, email, errors }
  })
}

const csvCell = (value: unknown) => {
  const text = value == null ? '' : String(value)
  return /[",\\r\\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text
}
export function contactsToCsv(rows: Array<{ full_name: string; type: string; phone_e164: string | null; email: string | null }>) {
  return [['full_name', 'type', 'phone_e164', 'email'], ...rows.map((r) => [r.full_name, r.type, r.phone_e164, r.email])]
    .map((row) => row.map(csvCell).join(',')).join('\\r\\n')
}
