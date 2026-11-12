# WE4ALL Shop and Rides draft: trial dispatch

This branch follows the account/OTA candidate. It is a **staging pilot only**. Requests, rider presence, assignment, progress and audit events use Postgres; no estimated route fare, merchant delivery assignment, driver payout, payment, navigation service, or background tracking is claimed. The existing local ride cart is a legacy saved selection and is never automatically dispatched. The new Rides screen starts each request afresh.

## Deployment boundary

1. Reconcile the preceding account/OTA migration stack in an isolated Supabase staging project, then apply `20261110051815_ride_dispatch_trial.sql` through the standard migration process. It creates its own private schema and starts `enabled=false`.
2. Create staging Auth accounts for a confirmed customer and a Founder-reviewed rider. The rider's approved application must include `application_payload.partner_details.vehicleClass` and `vehicleRegistration`; both approved `we4all_user_roles` and `we4all_partners` records are required. Never promote a pending application for a test.
3. Review staging rate limits, zone coverage, user consent, local transport obligations and support process. In staging SQL only, set `update we4all_rides_private.settings set enabled=true where singleton;` to open this pilot. To close it, set `enabled=false`; signed-in riders can still go offline and customers can still cancel open requests.
4. Verify an actual customer and rider account on separate devices: request bike/auto/cab, view only matching offers within 10 km, accept once, confirm pickup and arrival, cancel/expire, revoke rider approval, and test connectivity loss. Confirm the browser cannot read the private schema and a second rider never accepts the same trip. A separate production rollout needs explicit review and an operational support plan.

## Flow and safeguards

- Customer must have a confirmed Auth identity, active session and approved customer role. Server requires a precise pickup pin (200 m accuracy or better), address and destination text, vehicle and service. One active trip per customer, ten requests per hour, ten-minute request expiry, and retry key for uncertain connectivity.
- A rider must have an active session, approved role, approved partner record and approved application with vehicle details. Presence is opt-in, foreground only, refreshed every 30 seconds, expires after two minutes, and is removed on logout from the rider screen when possible. No GPS history is stored; the last current pin is visible only to the customer of an assigned active trip. Unassigned riders receive only the service, vehicle and approximate pickup distance. Database rows are inaccessible directly to clients.
- Assignment takes a row lock; request and status changes carry a version. Rider marks arrival, customer confirms pickup, rider marks destination, and customer confirms completion. Either party can cancel before pickup. Audit events record transitions. Trips are trial only and never accrue wages or payment.

## Verified locally

`npm test` includes an embedded Postgres test of the migration, auth, RLS, approval, class and radius matching, stale GPS, retry handling, status ownership, expiry and rate limiting. `npm run build` and `npx cap sync android` also passed. Embedded Postgres does not replace concurrent physical devices or live Supabase verification. This branch cannot produce an OTA release until the separate staging project and protected release inputs described in `docs/SUPABASE_OTA_STAGING.md` are configured.
