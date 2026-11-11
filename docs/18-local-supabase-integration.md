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
