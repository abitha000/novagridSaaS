-- Tenant-scoped manual payment ledger. Gateway events are deliberately out of scope.
create or replace function public.novagrid_schema_version()
returns integer language sql stable set search_path = '' as $$ select 11 $$;

create table public.payment_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organisations(id) on delete cascade,
  contact_id uuid not null,
  amount_paise bigint not null check (amount_paise > 0 and amount_paise <= 100000000000),
  currency text not null default 'INR' check (currency = 'INR'),
  method text not null check (method in ('cash','upi','bank_transfer','card','cheque','other')),
  status text not null default 'received' check (status in ('received','refunded','void')),
  source text not null default 'manual' check (source = 'manual'),
  reference text check (reference is null or char_length(reference) <= 120),
  notes text check (notes is null or char_length(notes) <= 500),
  paid_at timestamptz not null default now(),
  recorded_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (tenant_id,id),
  foreign key (tenant_id,contact_id) references public.contacts(tenant_id,id)
);
create index payment_records_tenant_paid on public.payment_records(tenant_id,paid_at desc);
alter table public.payment_records enable row level security;
alter table public.payment_records force row level security;
revoke all on public.payment_records from anon, authenticated;
grant select, insert on public.payment_records to authenticated;
create policy payments_read on public.payment_records for select to authenticated
 using (private.has_permission(tenant_id,'payments.view') and private.has_module_access(tenant_id,'core.billing'));
create policy payments_insert on public.payment_records for insert to authenticated
 with check (private.has_permission(tenant_id,'payments.create') and private.has_module_access(tenant_id,'core.billing')
   and private.is_writable(tenant_id) and source='manual' and status='received' and recorded_by=auth.uid());
-- Append-only from the browser: no update/delete grants or policies.
