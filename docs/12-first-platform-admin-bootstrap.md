# First platform administrator bootstrap

This is a one-time, operator-controlled action. It is deliberately not exposed as public signup or a browser RPC.

## Preconditions

1. Review and apply the NOVAGRID migrations to the intended Supabase project in order.
2. Confirm `public.novagrid_schema_version()` returns `10`.
3. Create the intended administrator account through Supabase Auth.
4. Verify the account's email in Supabase Auth.
5. Copy that Auth user's UUID from the Supabase Dashboard.

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

## Safeguards

- Protect the first super-admin account with a unique password and MFA.
- Grant super-admin only to named, verified operators. Use support role for routine support.
- Never put this SQL in a public endpoint, client bundle, migration seed, repository secret, or signup form.
- Record who performed the bootstrap, when, and the target account in a secure operational log.
- To disable an incorrectly granted account in a controlled SQL session: `update public.platform_users set status = 'disabled' where user_id = '<verified UUID>';`

## Current limitation

The database approval RPCs enforce platform-admin authorization, but the current approval list/detail UI still uses sample data and simulated actions. Do not treat a visual demo approval as a real organisation approval. Live approval UI wiring remains a required production gate.
