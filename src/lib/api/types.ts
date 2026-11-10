// Types mirror supabase/proposed-migrations. They describe the PLANNED schema; nothing here proves it exists.
export type Channel = 'whatsapp' | 'sms' | 'email'

export type Workspace = {
  tenant_id: string
  role: { key: string; name: string } | null
  organisation: {
    id: string
    name: string
    approval_status: 'pending' | 'approved' | 'rejected'
    lifecycle_status: string
    industry: { key: string; name: string } | null
  } | null
}

export type RegistrationInput = {
  name: string
  ownerName: string
  phone: string
  address: string
  country: string
  state: string
  city: string
  categoryKey: string
  orgType: string
  planKey: string
}

export type Contact = {
  id: string
  tenant_id: string
  type: string
  full_name: string
  phone_e164: string | null
  email: string | null
  attributes: Record<string, unknown>
  status: 'active' | 'inactive'
  created_at: string
  communication_preferences?: { channel: Channel; consent_status: 'opted_in' | 'opted_out' | 'unknown' }[]
}

export type StaffMember = {
  id: string
  tenant_id: string
  user_id: string
  full_name: string | null
  email: string | null
  status: 'invited' | 'active' | 'disabled'
  created_at: string
  role: { id: string; key: string; name: string } | null
}

export type Template = {
  id: string
  tenant_id: string
  channel: Channel
  name: string
  body: string
  provider_template_id: string | null
  dlt_template_id: string | null
  provider_status: 'draft' | 'pending' | 'approved' | 'rejected'
}

export type NotificationRow = {
  id: string
  tenant_id: string
  title: string
  channel: Channel
  fallback_channel: Channel | null
  body: string
  audience_definition: Record<string, unknown>
  scheduled_at: string | null
  status: 'draft' | 'scheduled' | 'queued' | 'sending' | 'completed' | 'cancelled' | 'failed'
  recipient_count: number
  created_at: string
}

export type RecipientStatus = 'queued' | 'submitted' | 'sent' | 'delivered' | 'read' | 'failed' | 'retrying' | 'skipped'
export type RecipientRow = {
  id: string
  notification_id: string
  contact_id: string
  channel: Channel
  status: RecipientStatus
  skip_reason: string | null
  attempts: number
  error_code: string | null
  is_permanent: boolean
  updated_at: string
  contact?: { full_name: string } | null
}
