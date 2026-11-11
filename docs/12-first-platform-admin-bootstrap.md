# First platform administrator bootstrap

This is a one-time, operator-controlled action. It is deliberately not exposed as public signup or a browser RPC.

## Preconditions

1. Review the production rollout gates in [the pre-production security review](11-preproduction-security-review-and-rollout-gate.md).
2. Apply the reviewed NOVAGRID migrations to the intended Supabase project in order, during an approved rollout window with a verified backup.
3. Confirm `public.novagrid_schema_version()` returns `11`.
4. Create the intended administrator account through Supabase Auth.
5. Verify the account's email in Supabase Auth.
6. Copy that Auth user's UUID from the Supabase Dashboard.

Do not use this runbook to bypass the rollout gate or bootstrap against a database where the NOVAGRID schema is not installed.

## Grant the first administrator

In Supabase Dashboard → SQL Editor, select the correct project, replace the UUID below with the verified Auth user's UUID, and execute as the database owner:

```sql
begin;
do $bootstrap$
declare
  target_user uuid := 'REPLACE-WITH-VERIFIED-AUTH-USER-UUID';
  confirmed_at timestamptz;
begin
  select email_confirmed_at into confirmed_at
  from auth.users where id = target_user;
  if not found then raise exception 'Auth user does not exist'; end if;
  if confirmed_at is null then raise exception 'Refusing to grant platform access to an unverified email'; end if;

  insert into public.platform_users (user_id, role, status)
  values (target_user, 'super_admin', 'active')
  on conflict (user_id) do update set role = 'super_admin', status = 'active';
end
$bootstrap$;
commit;
```

Sign in with that Auth account and verify the platform console loads. The app reads the role from `public.platform_users`; there is no hard-coded admin email or browser-side service-role key.

## Verify

```sql
select pu.user_id, au.email, au.email_confirmed_at, pu.role, pu.status, pu.created_at
from public.platform_users pu
join auth.users au on au.id = pu.user_id
where pu.status = 'active'
order by pu.created_at;
```

## Current approval workflow

The platform approval list and detail screens are now wired to the live organisation API:

- The queue reads organisation records from the database and filters for pending approvals.
- Platform administrators can approve a requested category or assign another active category.
- Rejection requires a reason.
- Approval changes category/lifecycle approval state only; subscription activation remains a separate operation.
- The database RPCs enforce platform-admin authorization. Hiding or changing the UI does not grant privileges.

These screens are live only when the app detects the required NOVAGRID schema and the signed-in user has an active platform role. Until migrations are deliberately deployed and the first administrator is bootstrapped, the production project remains on its existing scaffold and the app must not be treated as live.

## Safeguards

- Protect the first super-admin account with a unique password and MFA.
- Grant super-admin only to named, verified operators. Use support role for routine support.
- Never put this SQL in a public endpoint, client bundle, migration seed, repository secret, or signup form.
- Record who performed the bootstrap, when, and the target account in a secure operational log.
- To disable an incorrectly granted account in a controlled SQL session: `update public.platform_users set status = 'disabled' where user_id = '<verified UUID>';`

## Not yet implemented

- Payment gateway checkout, payment verification webhooks and automatic subscription activation.
- Notification provider dispatch and delivery webhooks.
- Customer-facing approval/rejection email or SMS notifications.
- A full production rehearsal of registration → email confirmation → category approval → plan/payment → workspace activation.

Do not describe any of these as operational until implemented and tested.
