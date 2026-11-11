# Staff invitation deployment gate

The staff invitation Edge Function is proposed code only. This PR does not deploy it or change the hosted Supabase project.

## Flow and security boundaries

1. The browser calls `invite-staff` with its user JWT. The service-role key is never sent to the browser.
2. The function validates method, origin, payload size, email, role and display name.
3. The caller-scoped client verifies the JWT and invokes `can_manage_staff`.
4. The caller reserves a staff seat with `reserve_staff_invitation`. The database locks the organisation row, checks subscription eligibility, role, duplicates and active + invited + reserved seats.
5. Only after a reservation succeeds does the function use the service-role client to send the Auth invitation.
6. `complete_staff_invitation` converts the reservation to an invited tenant membership in one transaction. Failed Auth delivery releases the reservation.
7. Reservations expire after 15 minutes. A scheduled cleanup is optional; expired reservations are ignored and removed on the next reservation for that tenant.

The reservation table has RLS enabled and no browser/API grants. Completion and release RPCs are service-role-only. The database trigger also enforces staff capacity for direct active/invited membership writes.

## Required deployment configuration

Before deployment, set `APP_ALLOWED_ORIGINS` to exact HTTPS origins, comma-separated, for example:

`APP_ALLOWED_ORIGINS=https://app.example.com,https://www.example.com`

Do not use `*`. Include the production app origin and any intentionally supported preview origin only. Supabase injects `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.

After the migration has been reviewed and applied through the approved rollout:
- Deploy with `supabase functions deploy invite-staff`.
- Configure the function secret using the Supabase dashboard/CLI secret workflow.
- Test with an owner, a staff manager, a non-manager, a disabled/suspended organisation, expired subscription, duplicate email, and exhausted staff capacity.
- Confirm invitation email delivery and redirect URLs in Supabase Auth settings.
- Verify that the invited account can complete the app's invitation/activation flow before enabling the feature for customers.

## Known boundary

The current app's staff invitation function is still not deployed. The proposed function sends the Auth invitation and then creates the invited membership. If the Auth email succeeds but the membership completion fails, the function returns a generic reconciliation error; it does not delete the Auth identity. Platform support must reconcile that rare partial failure before the user is re-invited.

No production function deployment, secret change, Auth email configuration or live database migration is performed by this PR.
