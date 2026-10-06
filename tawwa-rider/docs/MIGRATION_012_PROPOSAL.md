# Migration 012 — Rider backend (PROPOSAL ONLY)

> Status: **proposal for review. Not implemented, not executed.** No SQL file
> exists in this repository. Nothing here has touched production Supabase.

The Rider app (Phase 1) calls the RPCs below. Until they exist every call
returns `PGRST202`, which the app maps to `BACKEND_NOT_READY` and renders as a
"rider system not connected yet" state.

## 1. Principles

1. **Identity = `auth.uid()`.** No RPC accepts `rider_id`. Every function
   resolves the rider with `select … from rider_profiles where user_id = auth.uid()`.
2. **RPC-only writes.** Riders get **no** `insert/update/delete` grants on any
   table. All mutations are `security definer` functions with
   `set search_path = ''`, explicit state checks and row locks.
3. **Backend decides.** Zone, vehicle type, delivery mode, dispatch, job
   ownership, allowed actions, money: all server-side.
4. **Never mutate `fulfillment_orders` from the client.** Rider transitions
   update `delivery_assignments`; a trigger/function propagates the relevant
   milestone to the fulfillment engine and writes `order_events`.
5. **Least customer data.** Exact address / coordinates / phone revealed only
   from `picked_up` onward (pickup phone from `accepted`).

## 2. Entities

| Entity | Kind | Purpose |
|---|---|---|
| `rider_vehicle_type` | enum | `bicycle`, `motorcycle` |
| `rider_approval_status` | enum | `pending_approval`, `approved`, `rejected`, `suspended`, `inactive` |
| `delivery_assignment_status` | enum | `offered`, `assigned`, `accepted`, `arrived_at_pickup`, `picked_up`, `on_the_way`, `arrived_at_dropoff`, `delivered`, `cancelled`, `failed` |
| `rider_profiles` | table | `id`, `user_id → auth.users unique`, `full_name`, `phone`, `avatar_url`, `approval_status`, `vehicle_type` (nullable until assigned), `created_at`, `updated_at`, `approved_by`, `approved_at`. Written only by Ops (Control Center / service role). |
| `rider_zone_assignments` | table | `rider_id`, `zone_id → zones`, `active_from`, `active_to`, `assigned_by`. Partial unique index: one active row per rider. History preserved. |
| `rider_availability` | table (1 row per rider) | `rider_id pk`, `is_online`, `changed_at`, `last_lat`, `last_lng`, `last_accuracy_m`, `last_seen_at`. Current state only — cheap for dispatch queries. |
| `rider_location_pings` | table, append-only, time-partitioned (daily) or TTL'd | `rider_id`, `assignment_id null`, `lat`, `lng`, `accuracy_m`, `heading`, `speed_mps`, `recorded_at`, `received_at`. Retain ~7–30 days; for audit/disputes, not dispatch. |
| `delivery_assignments` | table | `id`, `fulfillment_order_id → fulfillment_orders`, `rider_id null`, `status`, `required_vehicle_type` (copied from the branch-distance rule at creation), `zone_id`, `offered_at`, `offer_expires_at`, `accepted_at`, `arrived_pickup_at`, `picked_up_at`, `on_the_way_at`, `arrived_dropoff_at`, `delivered_at`, `cancelled_at`, `cancel_reason`, `cod_amount`, `cod_collected_amount`, `version`. Partial unique index: one non-terminal assignment per rider; one non-terminal assignment per fulfillment order. |
| `delivery_offers` | table | `assignment_id`, `rider_id`, `offered_at`, `expires_at`, `response` (`accepted`/`declined`/`expired`). Supports broadcast or sequential dispatch without overloading `delivery_assignments`. |
| `delivery_issues` | table | `id`, `assignment_id`, `rider_id`, `issue_type` enum (`cannot_find_customer`, `customer_unavailable`, `merchant_delay`, `order_issue`, `vehicle_issue`, `other`), `note` (≤500), `status` (`open`/`acknowledged`/`resolved`), `created_at`, `resolved_by`, `resolved_at`. |
| `delivery_events` | table, append-only | `assignment_id`, `actor_type` (`rider`/`ops`/`system`), `actor_id`, `from_status`, `to_status`, `payload jsonb`, `lat`, `lng`, `created_at`. Audit trail for every transition; also mirrored into `order_events`. |
| `rider_earnings_ledger` | table, append-only | `id`, `rider_id`, `assignment_id null`, `entry_type` (`delivery_fee`, `commission`, `bonus`, `adjustment`, `cod_collected`, `cod_remitted`), `amount numeric(12,2)`, `currency`, `effective_at`, `created_by`, `reference`. Corrections are new rows, never updates. |
| `rider_commission_rules` | table (Ops only) | Versioned rules by zone / vehicle type / distance band. Only server functions read them. |

### Views (internal, not exposed to `anon`/`authenticated`)

- `v_rider_current_zone` — active zone per rider.
- `v_rider_earnings_daily` — aggregates the ledger per rider/day; backs `rider_my_earnings`.
- `v_dispatch_candidates` — online, approved riders with fresh `last_seen_at`, matching zone + vehicle type. Used only by the dispatcher.

## 3. RPCs (all `security definer`, granted to `authenticated` only)

| RPC | Returns | Rules |
|---|---|---|
| `rider_my_context()` | context JSON | `RIDER_NOT_FOUND` if no profile. Includes `can_go_online` (approved ∧ zone ∧ vehicle ∧ not suspended), `active_job_id`, `today_completed_count`. |
| `rider_set_online(p_online, p_lat, p_lng, p_accuracy_m)` | `{is_online, changed_at}` | Going online requires `can_go_online` and a fresh fix (optionally inside zone polygon + buffer). Going offline never cancels an active assignment; it only removes the rider from new dispatch. |
| `rider_my_active_job()` | job summary or null | The rider's single non-terminal assignment (including `offered` to them). |
| `rider_available_jobs()` | job summary[] | Only when online; only offers addressed to this rider (or open pool in rider's zone with matching `required_vehicle_type`, if pool dispatch is enabled). Minimal fields, area only. |
| `rider_job_details(p_job_id)` | job details | `JOB_NOT_FOUND` unless the job is assigned/offered to this rider. Customer address/coords/phone null before `picked_up`. Returns `allowed_actions`. |
| `rider_accept_job(p_job_id)` | job details | `select … for update`; requires an unexpired offer to this rider, rider online, no other active job, vehicle type matches. |
| `rider_arrived_at_pickup(p_job_id)` | job details | `accepted → arrived_at_pickup`. Optional geofence check vs branch coords. |
| `rider_confirm_pickup(p_job_id)` | job details | `arrived_at_pickup → picked_up`; requires merchant-side `ready_for_pickup` in the fulfillment engine. |
| `rider_start_delivery(p_job_id)` | job details | `picked_up → on_the_way`. |
| `rider_arrived_at_dropoff(p_job_id)` | job details | `on_the_way → arrived_at_dropoff` (proposed addition to the original contract). |
| `rider_complete_delivery(p_job_id, p_cod_collected)` | job details | `on_the_way/arrived_at_dropoff → delivered`; if COD, `p_cod_collected` must equal `cod_amount` (else `INVALID_TRANSITION`); writes ledger rows (`delivery_fee`, `commission`, `cod_collected`) in the same transaction. |
| `rider_report_issue(p_job_id, p_issue_type, p_note)` | `{issue_id, created_at}` | Job must belong to rider and be non-terminal. Rate-limited per job. Notifies Ops. |
| `rider_update_location(p_lat, p_lng, p_accuracy_m, p_heading, p_speed_mps, p_recorded_at)` | `{accepted, next_min_interval_s}` | Only while online or with an active job. Server-side throttle (reject if last ping < N s ago), sanity checks (accuracy, impossible speed, future timestamps). Upserts `rider_availability`, appends `rider_location_pings`. `next_min_interval_s` lets Ops slow fleets down without an app release. |
| `rider_my_history(p_limit, p_before)` | job summary[] | Terminal assignments of this rider, keyset pagination. |
| `rider_my_earnings(p_period)` | earnings summary | Aggregated from the ledger only. |

**Error convention:** `raise exception using errcode = 'P0001', message = 'INVALID_TRANSITION: …'`
with prefixes `RIDER_NOT_FOUND`, `FORBIDDEN`, `JOB_NOT_FOUND`, `INVALID_TRANSITION`.
The app's `mapPostgrestError` already understands these.

## 4. Dispatch architecture

- **Assignment creation**: when a fulfillment order reaches `ready_for_pickup`
  (or earlier, `preparing`, for lead time) a trigger inserts a
  `delivery_assignments` row with `required_vehicle_type` derived from the
  existing branch-distance coverage rule — the same rule the Customer side
  already uses. The rider app never computes it.
- **Matching**: a dispatcher function (`dispatch_tick()`, run by `pg_cron`
  every 10–20 s, or an Edge Function) picks candidates from
  `v_dispatch_candidates` ordered by distance to branch, creates
  `delivery_offers` with a short TTL (e.g. 45 s) and sets the assignment to
  `offered`. Expired/declined offers move to the next candidate.
- **Ops override**: Control Center can assign directly (`assigned` state,
  skipping offers) and reassign/cancel. These are separate Ops-only RPCs.
- Self-assignment from a pool is **off by default**; enable per zone with a flag.

## 5. RLS / grants

- `enable row level security` on every new table; **no** policies for
  `authenticated` on base tables except, optionally, `select` on
  `rider_profiles where user_id = auth.uid()`.
- `revoke all on function … from public, anon`; `grant execute … to authenticated`.
- Ops access via existing Control Center role/claims, never via the rider app.

## 6. Realtime (later)

Prefer a narrow broadcast channel per rider (`rider:{uid}`) fed by a trigger on
`delivery_offers`/`delivery_assignments`, carrying only `{job_id, status}`; the
app then calls `rider_job_details`. Avoid Postgres-changes on base tables.

## 7. Open questions for review

1. Phone OTP: is an SMS provider configured on `supabase.operines.ae`? (The app supports phone OTP and email/password.)
2. Pool vs offer-only dispatch per zone?
3. COD remittance flow (cash handover to Ops) — separate ledger entries + Ops RPC.
4. Location retention period for `rider_location_pings`.
5. Whether `arrived_at_dropoff` is required or optional per zone.
