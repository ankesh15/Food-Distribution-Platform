# Project audit — 16 October 2026

## Scope and baseline

Inspected the existing Express 4 / Mongoose 7 API, MongoDB schemas, JWT middleware, email/SMS/geocoding services, Socket.IO server, React 19 / CRA 5 client, Tailwind and MUI 7 components, every page and context, manifests, tests, example configuration, Git diff and existing reports. No repository AGENTS.md was found. There are no deployment manifests or CI workflows in the supplied project. Node 22 and installed dependencies are available; no system `mongod` binary was found.

The checkout already contained 22 modified tracked files and four untracked reports/middleware files. These are user work and are preserved. Earlier reports claiming production readiness are historical claims, not verification for this run. Credentials in `.env` have not been printed or changed. A baseline patch was saved outside the repository in `/tmp/food-platform-existing-changes.patch`.

## Confirmed issues, ordered by risk

| Priority | Finding at baseline | Evidence / affected area |
| --- | --- | --- |
| Critical | Creation spreads the entire request body into a Donation, allowing supplied status, claimant and notification fields to bypass the workflow. | `server/routes/donations.js` POST `/` |
| Critical | Editing, deletion, cancellation, pickup and completion use read/check/write sequences that race with claims and each other. Claim itself already uses an atomic update; retain that improvement. | donation mutation routes |
| Critical | Backend tests load the real `.env`, connect to its configured database and delete donations using a broad title regex. Running them unchanged could affect user data and send real messages. | `server/test/test.js`, automatic connection in `server/index.js` |
| High | Socket clients need no authentication, can join arbitrary rooms, and receive global lifecycle broadcasts including claimant data. | Socket.IO setup and donation events |
| High | Public detail responses expose donor and claimant phone numbers. | GET `/api/donations/:id` population |
| High | Upload validation trusts MIME and original extension; an image MIME can save HTML under an active extension. File signatures are not checked. | `server/middleware/upload.js` |
| High | Refresh tokens are plaintext, rotation can reuse identical JWTs issued in one second, password changes do not revoke sessions, and auth endpoints lack a dedicated brute-force limiter. | auth routes, User model, auth middleware |
| High | Preparation, expiry and pickup dates lack cross-field validation; coordinate bounds and many nested update fields are unchecked. Invalid model input often returns 500. | Donation model / mutation routes |
| High | Database startup failure is only logged; server still listens and health always reports OK. No graceful shutdown or production static SPA serving. | `server/index.js` |
| High | Requests, couriers, tracking routes, dashboard map and some analytics display fabricated records/telemetry. Requests and courier actions do not persist. | Requests, Volunteers, MapPage, TrackingContext, Dashboard, Analytics |
| Medium | Pagination and sort/search parameters are unbounded and unvalidated. Regex input is executable regex. `$near` cannot be used with `countDocuments`. | donation, user and admin list endpoints |
| Medium | Dashboard totals count only the first ten records; API helpers hide failures as empty successful results. | Dashboard, AuthContext |
| Medium | Client refresh queue retries login failures, may retain stale default Authorization headers, and queued requests can retry repeatedly. | AuthContext |
| Medium | Duplicate socket event names create duplicate notifications; notifications are seeded with fictional records and have no durable inbox. | NotificationContext |
| Medium | Google geocoder substitutes New York when credentials are absent, creating misleading map locations. | geocoder service |
| Medium | MUI 7 uses the new Grid API while pages use removed `item`/breakpoint props, risking broken responsive layouts. Missing 404 route, unlabeled icon controls and form labels, no reduced-motion handling. | client pages / layout |
| Medium | Admin may deactivate itself/other admins, and inactive-user reminder endpoint claims dispatch without sending anything. | admin routes |
| Medium | Production client defaults to localhost; upload URLs assume a shared origin, and local disk uploads require persistent storage. | config, image consumers, deployment |

## Existing behavior to preserve

Self-registration permits donors and recipients only. Admin creation remains an operator task. Donor and recipient permissions allow admin role, but resource ownership still applies on donor mutations and recipient pickup/completion. Claims may be made before the pickup window starts. Cancellation is permitted by the owner before pickup; after pickup, completion is the supported terminal transition. Existing fractional quantities (minimum 0.1), email/SMS preferences, public discovery, profile and admin pages are retained.

## Verification strategy

First isolate tests from the configured database and external integrations. Add deterministic security/API tests and a separate explicit disposable-database integration suite for real MongoDB contention and complete workflows. Run client tests, lint, server syntax checks and production build. Record exact outcomes and external blockers in `IMPLEMENTATION_REPORT.md`; do not infer runtime/deployment success from a build.

## Follow-up tracking

This document records the pre-change findings. The implementation report records resolved items, verification evidence and remaining risks. A production launch still requires a real database, strong independent secrets, approved origins, persistent upload storage, and verified optional email/SMS/geocoding credentials.
