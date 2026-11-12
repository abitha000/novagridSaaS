# PR #24 — Local Supabase integration testing

This workflow starts an ephemeral Supabase stack inside a GitHub Actions runner. It does not connect to the user's cloud Supabase project and creates no paid Supabase branch.

## Coverage
- Starts local Supabase Auth, PostgREST, PostgreSQL and Storage services.
- Applies the ordered repository migrations to the disposable local database.
- Creates two temporary confirmed Auth users.
- Seeds two approved gym tenants with active subscriptions and one contact each.
- Verifies each authenticated user sees only their own contact through PostgREST.
- Verifies anonymous PostgREST requests cannot enumerate organisations.
- Verifies tenant A can upload a Storage object under its own tenant path and cannot upload into tenant B's path.
- Removes the temporary Auth users and tears down the local stack.

## Limits
This first integration slice does not yet test email confirmation redirects, organisation registration RPC end-to-end, platform admin bootstrap, signed URL read/delete/update, quota overflow, Edge Functions, provider webhooks or backup restoration. It also does not certify the hosted Supabase project configuration. The existing separate manual rehearsal preflight remains available for a disposable hosted project.

The test uses synthetic identities and fixture records only. No production project URL, key or data is used.


## Expanded Storage API rehearsal (PR #52)

The local integration workflow now creates files for two disposable tenants and exercises the real Supabase Storage HTTP API:
- Tenant A and tenant B can each upload their own object.
- Tenant A can list, download through a signed URL, and delete its own object.
- Tenant A cannot upload into, list, directly download, sign, or delete tenant B's object.
- A test-only reduction of the gym starter storage allowance to 1 MiB makes a 2 MiB upload attempt verify quota rejection.
- Tenant B's object is checked after Tenant A's denied delete to prove it remains intact.

These checks run only against the ephemeral Supabase stack created by GitHub Actions. They do not modify hosted projects. The test suite still does not replace a backup/restore rehearsal or a full production deployment review.


## Expanded Auth and platform authorization negatives (PR #53)

The ephemeral integration script additionally verifies:
- An unconfirmed email cannot obtain a password-grant session.
- Registration rejects unknown industry categories and unknown plan preferences.
- A tenant owner cannot approve an organisation.
- Platform approval rejects an unsupported decision value.

These checks run against disposable local Auth users and fixture records only.
