# Tawwa Rider

Operational delivery app for Tawwa riders (Expo SDK 57, Expo Router, TypeScript,
TanStack Query, Supabase Auth). Arabic-first with English and RTL.

> **Phase 1 status:** frontend complete; the Rider backend (Migration 012) does
> not exist yet. Every Rider RPC returns `BACKEND_NOT_READY` and the app shows
> a "rider system not connected yet" state. No fake data anywhere.

## Run

```bash
cp .env.example .env.local   # fill in the PUBLIC anon key only
npm install
npm start                    # Expo Go works for foreground features
```

Quality gates:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint
npm test            # node:test unit tests for pure logic
npx expo export --platform all
```

## Identity

| | |
|---|---|
| Name | Tawwa Rider |
| Slug / scheme | `tawwa-rider` |
| iOS bundle id / Android package | `com.tawwa.rider` |

## Layout

```
src/
  app/                        Expo Router routes only
    _layout.tsx               providers + auth-protected stacks
    (auth)/sign-in.tsx        phone OTP or email/password (no self sign-up)
    (app)/_layout.tsx         Rider gate (approval / zone / vehicle / backend-pending)
    (app)/(tabs)/             index (Home), deliveries, earnings, account
    (app)/job/[id].tsx        Job detail + state-machine CTA
  services/rider/             THE ONLY place that calls Rider RPCs
    types.ts                  contract types
    riderApi.ts               rpc wrappers (no rider_id is ever sent)
    parse.ts                  runtime validation of responses
    errors.ts                 PostgREST → RiderErrorCode (BACKEND_NOT_READY, …)
    queries.ts                TanStack Query hooks, keys scoped by auth uid
  features/
    auth/                     Supabase session provider + sign-in helpers
    rider/                    gate logic, RiderProvider, online toggle
    delivery/                 UI state machine + labels
    location/                 permission readiness, throttling policy, publisher
    maps/                     hand-off to installed maps app / phone dialer
  components/ui|rider|delivery
  i18n/                       ar (primary) + en dictionaries, RTL handling
  theme/tokens.ts             Tawwa colours, spacing, type
docs/MIGRATION_012_PROPOSAL.md  backend proposal (not implemented)
```

## Brand assets

Replace `assets/icon.png`, `assets/splash-icon.png`, the Android adaptive
icons and `src/components/ui/BrandMark.tsx` with the Tawwa assets from the
Customer App, and align `src/theme/tokens.ts` with its token values.

## Location

Foreground-only (`whenInUse`), background permission explicitly blocked in
`app.json`. Policy in `src/features/location/policy.ts`:

| Mode | Watch | Publish at most | Min movement | Heartbeat | Accuracy |
|---|---|---|---|---|---|
| online, no job | 30 s / 75 m | every 60 s | 150 m | 5 min | balanced |
| active job | 10 s / 25 m | every 15 s | 40 m | 60 s | high |

Fixes worse than 150 m are dropped; failures back off 5 s → 120 s keeping
only the newest fix; the server can slow clients down via
`next_min_interval_s`; publishing stops for the session on
`BACKEND_NOT_READY`/`FORBIDDEN`. Background tracking needs a development
build with `expo-task-manager` and a separate store-review justification.
