# Food Distribution Platform — Complete Codebase Audit & Technical Report

**Repository**: [Food-Distribution-Platform](https://github.com/ankesh15/Food-Distribution-Platform)  
**Audit Date**: September 20, 2026  
**Auditor Roles**: Senior Full-Stack Engineer, QA Engineer, Security Engineer, Database Engineer, DevOps Engineer  
**Audit Protocol**: Rule 1 — Audit First, Fix Second. All findings are derived from static inspection, dependency audits, build verification, and live end-to-end test execution against MongoDB, Express, and React.

---

## 1. Executive Summary

### What Works
- **Core Authentication**: User registration, bcrypt password hashing (cost factor 12), login credential validation, access JWT generation (15-min expiry), refresh token rotation, and token-based logout function as intended.
- **Role-Based Access Control (RBAC)**: Route-level middleware (`authenticateToken`, `requireDonor`, `requireRecipient`, `requireAdmin`) properly isolates donor, recipient, and admin boundaries on most endpoints. Privilege escalation to admin via registration or profile update is prevented.
- **Sequential Donation Lifecycle**: A donor can create a listing, a recipient can claim it, mark it picked up, and complete it under normal sequential conditions.
- **Frontend Compilation**: The React 19 application compiles cleanly with `react-scripts build` into an optimized bundle (`395.42 kB` JS gzip).
- **Public & Admin Overview Statistics**: Aggregations across active users, total donations, and completed pickups calculate and return accurately.

### What is Broken
- **Critical Concurrency Race Condition in Claiming**: The claim transaction (`POST /api/donations/:id/claim`) uses an uncoordinated `findById` followed by an in-memory status check and `save()`. Under simultaneous claims by two recipients, both requests succeed, causing double-claiming and data inconsistency.
- **Mass Assignment Vulnerability in Donation Update**: `PUT /api/donations/:id` executes `Object.assign(donation, req.body)` without a field whitelist, allowing donors to bypass the lifecycle and arbitrarily set `status: 'completed'` or hijack ownership (`donor`).
- **Frontend Runtime Crash on Registration Validation Failure**: `Register.js` directly renders `error` in JSX. When express-validator returns an array of error objects, React crashes with `Objects are not valid as a React child`.
- **Geospatial Index Mismatch Runtime Crash**: `GET /api/users/nearby-recipients` always crashes with HTTP 500 (`unable to find index for $geoNear query`) because the 2dsphere index is defined on `profile.location`, but the route queries `'profile.location.coordinates'`.
- **Unhandled TypeError in Email Service**: `sendDonationNotification`, `sendClaimNotification`, and `sendPickupReminder` invoke `transporter.sendMail()` without verifying if `createTransporter()` returned `null`. Whenever SMTP credentials are not configured, they throw `TypeError: Cannot read properties of null (reading 'sendMail')`.
- **Socket.IO Real-Time Event Mismatch**: The backend emits `new-donation`, but the frontend listens for `donation-created`. The backend emits `donation-claimed`, but the frontend has no listener. Real-time updates never update frontend notification state.
- **Unhandled CastErrors on Malformed ObjectIds**: Endpoints querying by ID fail to validate 24-character hexadecimal ObjectId strings prior to Mongoose calls, returning HTTP 500 with raw internal CastError details instead of HTTP 400 or 404.

### Major Risks & Missing Functionality
- **Simulated & Client-Only Features**: Four major pages advertised as platform features (`/requests`, `/volunteers`, `/analytics`, `/map`) are 100% hardcoded in client-side React `useState` or mock coordinates. There are no backend database models, schemas, or REST endpoints for community food requests or logistics couriers.
- **Multer Image Upload Completely Missing**: Multer is listed in dependencies and claimed in the README, but is never imported or mounted in any route. The donation creation form contains no image upload input.
- **Dead Integration Code**: Both Twilio SMS (`smsService.js`) and Google Maps Geocoder (`geocoder.js`) exist as dead files that are never imported or invoked by any controller or route.
- **Admin Reminders Are Stubs**: Both admin reminder endpoints query the database and log counts to the server console, returning a fake `"queued"` response without sending any notifications.

---

## 2. Architecture Analysis

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND (React 19)                              │
│                                                                             │
│  [Public Marketing]           [Hybrid Feed]          [Protected Dashboard]  │
│  - Home (/)                   - Donations (/donations)- Dashboard (/dashboard)│
│  - Login (/login)             - Detail (/donations/:id)- Create Donation     │
│  - Register (/register)                               - Profile & Settings  │
│                                                       - Admin Panel (/admin)│
│                                                       - Mock: Map/Req/Vol   │
└───────────────────────┬───────────────────────────────────▲─────────────────┘
                        │ HTTP / JSON (Axios)               │ Socket.IO Client
                        │ Bearer JWT + Refresh Interceptor  │ (Disconnected Events)
                        ▼                                   │
┌───────────────────────────────────────────────────────────┴─────────────────┐
│                            BACKEND (Express 4.18)                           │
│                                                                             │
│  Middleware Layer:                                                          │
│  - helmet(), cors(), express-mongo-sanitize(), rateLimit(/api/)             │
│  - authenticateToken, requireRole(['donor', 'recipient', 'admin'])          │
│                                                                             │
│  Route Handlers:                                                            │
│  - /api/auth       (register, login, refresh, logout, me, verify)           │
│  - /api/users      (profile, password, donations, claimed-donations, geo)   │
│  - /api/donations  (list, detail, create, update, claim, pickup, complete)  │
│  - /api/admin      (stats, users, donations, status, reminders)             │
│  - /api/stats/public & /api/health                                          │
└───────────────────────┬─────────────────────────────────────────────────────┘
                        │
         ┌──────────────┼───────────────────────────┐
         ▼              ▼                           ▼
┌────────────────┐ ┌──────────────────────────┐ ┌─────────────────────────────┐
│  DATABASE      │ │ UNINTEGRATED / DEAD      │ │ EXTERNAL SERVICES           │
│  MongoDB Atlas │ │ - Multer (never used)    │ │ - Nodemailer (crashes null) │
│  - User Schema │ │ - smsService (dead code) │ │ - Twilio (not connected)    │
│  - Donation    │ │ - geocoder (dead code)   │ │ - Google Maps (not used)    │
└────────────────┘ └──────────────────────────┘ └─────────────────────────────┘
```

### Communication Paths
1. **Frontend → API → Backend → Database**:
   - Axios instance in `client/src/context/AuthContext.js` attaches `Bearer <accessToken>` via request interceptors.
   - Automatic 401 response interceptor attempts a single token refresh against `POST /api/auth/refresh` using `refreshToken` from `localStorage`.
   - Backend routes validate inputs with `express-validator`, authenticate with `jsonwebtoken`, and query MongoDB via Mongoose models.
2. **Frontend ↔ Socket.IO ↔ Backend**:
   - Backend exposes an HTTP server-wrapped `socketIo` instance with `join-room` handlers.
   - Route handlers call `req.app.get('io').emit(...)`.
   - **Critical Failure**: The backend emits `new-donation` and `donation-claimed`. The frontend listens for `donation-created`, `request-created`, `volunteer-assigned`, `delivery-completed`, and `announcement`. There is zero alignment, resulting in silent message drops.

---

## 3. Build & Static Analysis Status

| Check | Command | Status | Details |
| :--- | :--- | :--- | :--- |
| **Backend Install** | `npm install` | **PASSED** | Installed 17 direct dependencies. |
| **Frontend Install** | `cd client && npm install` | **PASSED** | Resolved with peer-dependency compatibility. |
| **Client Build** | `cd client && npm run build` | **PASSED** | Production bundle compiled successfully (gzip 395.42 kB). |
| **Server Build** | `node server/index.js` | **PASSED** | Starts cleanly on port 5000 and connects to MongoDB. |
| **Client ESLint** | `npx eslint src/` | **FAILED** | 1 error in `src/App.test.js:103:1` (`import/first`). |
| **Client Tests** | `npm test -- --watchAll=false` | **PASSED (with warnings)** | 2 passed, 0 failed. Logged unhandled `act(...)` state warnings in AdminPanel and Dashboard. |
| **Backend Tests** | `node server/test/test.js` | **FAILED** | Throws `Error: Cannot find module 'supertest'`. No test script in `package.json`. |
| **Root npm audit** | `npm audit` | **FAILED** | 23 vulnerabilities (1 critical: `shell-quote`, 16 high, 6 moderate). |
| **Client npm audit** | `cd client && npm audit` | **FAILED** | 63 vulnerabilities (2 critical: `shell-quote`, `websocket-driver`, 34 high, 15 moderate, 12 low). |

---

## 4. Environment Variable Audit

| Variable | Used Where | Required? | Default | Audit Assessment |
| :--- | :--- | :--- | :--- | :--- |
| `PORT` | `server/index.js` | No | `5000` | **Correct**. Falls back to 5000 if omitted. |
| `NODE_ENV` | `server/index.js`, `server/test/test.js` | No | `undefined` | **Inconsistent**. Controls rate limiter (1000 vs 100 req/15m) and error stack exposure. |
| `MONGODB_URI` | `server/index.js`, `server/test/test.js` | **Yes** | None | **Connected**. Valid Atlas URI present in `.env`. |
| `JWT_SECRET` | `server/middleware/auth.js`, `server/routes/auth.js` | **Yes** | None | **Security Warning**: Set to 21 characters (`.env.example` requires `min_32_chars`). |
| `JWT_REFRESH_SECRET` | `server/middleware/auth.js`, `server/routes/auth.js` | **Yes** | None | **Security Warning**: Set to 20 characters. Should be high-entropy 256-bit string. |
| `CLIENT_URL` | `server/index.js` | No | `http://localhost:3000` | **Fragile**: Trailing slashes break CORS comparison (`.split(',').map(url => url.trim())` without trailing slash stripping). |
| `EMAIL_HOST` | `server/services/emailService.js` | Optional | None | **Bug Trigger**: When unset, causes TypeError in donation/claim notifications. |
| `EMAIL_PORT` | `server/services/emailService.js` | Optional | None | Missing default fallback (e.g. 587). |
| `EMAIL_USER` | `server/services/emailService.js` | Optional | None | Unset in active `.env`. |
| `EMAIL_PASS` | `server/services/emailService.js` | Optional | None | Unset in active `.env`. |
| `TWILIO_ACCOUNT_SID` | `server/services/smsService.js` | Optional | None | Dead configuration — `smsService.js` is never invoked. |
| `TWILIO_AUTH_TOKEN` | `server/services/smsService.js` | Optional | None | Dead configuration. |
| `TWILIO_PHONE_NUMBER` | `server/services/smsService.js` | Optional | None | Dead configuration. |
| `GOOGLE_MAPS_API_KEY` | `server/utils/geocoder.js` | Optional | None | Dead configuration — `geocoder.js` is never invoked. |
| `REACT_APP_API_URL` | `client/src/config.js` | No | `http://localhost:5000/api` | **Correct**. Falls back cleanly. |
| `REACT_APP_SOCKET_URL` | `client/src/config.js` | No | `API_URL.replace(/\/api$/, '')` | **Correct**. Derives cleanly from API URL. |

---

## 5. API Inventory & Verification Results

| Method | Endpoint | Auth Required | Required Role | Server Validation | Test Status | Result & Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | None | Public | `express-validator` | Tested | **Working** (Duplicate email race condition returns 500 instead of 409; double save). |
| `POST` | `/api/auth/login` | None | Public | `express-validator` | Tested | **Working** (Returns access token, refresh token, public profile). |
| `POST` | `/api/auth/refresh` | Refresh Token | Active User | `jwt.verify` + DB check | Tested | **Working** (Validates rotation; invalidates after logout). |
| `POST` | `/api/auth/logout` | Bearer JWT | Active User | None | Tested | **Working** (Clears `user.refreshToken` in DB). |
| `GET` | `/api/auth/me` | Bearer JWT | Active User | None | Tested | **Working** (Returns sanitized user profile). |
| `POST` | `/api/auth/verify` | Bearer JWT | Active User | None | Tested | **Working** (Validates JWT session). |
| `GET` | `/api/users/profile` | Bearer JWT | Any Active | None | Tested | **Working** (Returns user profile). |
| `PUT` | `/api/users/profile` | Bearer JWT | Any Active | `express-validator` | Tested | **Working** (Supports flat and nested profile updates; role escalation blocked). |
| `PUT` | `/api/users/password` | Bearer JWT | Any Active | `express-validator` | Tested | **Working** (Verifies `currentPassword` against bcrypt hash; updates new hash). |
| `GET` | `/api/users/donations` | Bearer JWT | Any Active | Pagination query | Tested | **Working** (Filters by `donor: req.user._id`). |
| `GET` | `/api/users/claimed-donations` | Bearer JWT | Any Active | Pagination query | Tested | **Working** (Note: README documents this as `/api/users/claims`). |
| `PUT` | `/api/users/location` | Bearer JWT | Any Active | `isFloat` coordinates | Tested | **Working** (Updates `profile.location.coordinates`). |
| `GET` | `/api/users/nearby-recipients` | Bearer JWT | Any Active | Lat / Long query | Tested | **BROKEN (500)** (Mongoose queries `profile.location.coordinates` instead of `profile.location`). |
| `GET` | `/api/donations` | None | Public | Query parameters | Tested | **Working** (Supports text search, pagination, foodType, and geospatial filter). |
| `GET` | `/api/donations/:id` | None | Public | None | Tested | **BROKEN (500 on bad ID)** (CastError when ID format is invalid). |
| `POST` | `/api/donations` | Bearer JWT | Donor / Admin | `express-validator` | Tested | **Working with warnings** (Fallback coordinates hardcoded; triggers null mailer crash). |
| `PUT` | `/api/donations/:id` | Bearer JWT | Donor / Admin | `express-validator` | Tested | **BROKEN (Security)** (Mass assignment allows overwriting `status` and `donor`). |
| `POST` | `/api/donations/:id/claim` | Bearer JWT | Recipient / Admin | None | Tested | **BROKEN (Race Condition)** (Simultaneous claims double-claim the listing). |
| `POST` | `/api/donations/:id/pickup` | Bearer JWT | Recipient / Admin | None | Tested | **Working** (Enforces claiming recipient ownership and `claimed` status). |
| `POST` | `/api/donations/:id/complete` | Bearer JWT | Recipient / Admin | None | Tested | **Working** (Enforces claiming recipient ownership and `picked-up` status). |
| `POST` | `/api/donations/:id/cancel` | Bearer JWT | Donor / Admin | None | Tested | **Working** (Enforces donor ownership; blocks canceling completed donations). |
| `DELETE`| `/api/donations/:id` | Bearer JWT | Donor / Admin | None | Tested | **Working** (Blocks deleting claimed/completed items; allows owner to delete). |
| `GET` | `/api/admin/stats` | Bearer JWT | Admin | None | Tested | **Working** (Aggregates users, donations, 6-month monthly trends). |
| `GET` | `/api/admin/users` | Bearer JWT | Admin | Query filters | Tested | **Working** (Lists users with search and pagination). |
| `GET` | `/api/admin/users/:id` | Bearer JWT | Admin | None | Tested | **Working** (Returns user detail with recent activity). |
| `PATCH`| `/api/admin/users/:id/status` | Bearer JWT | Admin | Boolean `isActive` | Tested | **Working** (Note: README documents this as `PUT /api/admin/users/:id`). |
| `GET` | `/api/admin/donations` | Bearer JWT | Admin | Query filters | Tested | **Working** (Lists all donations with admin filters). |
| `GET` | `/api/admin/donations/:id` | Bearer JWT | Admin | None | Tested | **Working** (Returns donation with populated donor and recipient). |
| `DELETE`| `/api/admin/donations/:id` | Bearer JWT | Admin | None | Tested | **Working** (Admin override deletion). |
| `POST` | `/api/admin/reminders/inactive-users` | Bearer JWT | Admin | Query | Tested | **STUB / INCOMPLETE** (Counts users, logs to console, never sends emails). |
| `POST` | `/api/admin/reminders/pickup` | Bearer JWT | Admin | None | Tested | **STUB / INCOMPLETE** (Queries pickup list, returns fake count, never sends SMS/email). |
| `GET` | `/api/stats/public` | None | Public | None | Tested | **Working** (Returns platform totals and success rate). |
| `GET` | `/api/health` | None | Public | None | Tested | **Working** (Returns status 200, environment, and ISO timestamp). |

---

## 6. Detailed Domain Audits

### Authentication & Sessions
- **Registration**: Correctly validates standard fields. Enforces role restriction to `['donor', 'recipient']`. Prevents self-promotion to `admin`. Bcrypt salt rounds set to 12. Passwords are never stored in plaintext.
  - *Bug*: In `server/routes/auth.js:89-96`, the user is saved once, the refresh token is assigned, and saved a second time (`await user.save()` twice).
  - *Bug*: If two registration requests arrive concurrently for the same email, MongoDB throws an E11000 duplicate key error caught by the generic catch block, returning HTTP 500 instead of HTTP 409 Conflict.
- **Login**: Validates credentials against bcrypt hash. Validates `isActive: true`. Rejects disabled/suspended accounts with HTTP 401 (`Account is deactivated`). Generates 15-minute access token and 7-day refresh token.
- **Refresh & Rotation**: Access tokens expire in 15 minutes. The refresh endpoint validates JWT signature and verifies the incoming token matches `user.refreshToken` in MongoDB.
- **Logout**: Successfully clears `user.refreshToken = null` in the database. Subsequent refresh requests fail immediately.

### Authorization & RBAC
- **Token Verification**: `authenticateToken` strictly validates JWT signatures and checks user active status.
- **Role Enforcement**: Tested across all combinations. Non-admin users attempting admin routes receive HTTP 403. Donors attempting recipient claim routes receive HTTP 403. Recipients attempting donation creation receive HTTP 403.
- **IDOR Protection**: Donors cannot update (`PUT /donations/:id`) or delete (`DELETE /donations/:id`) other donors' donations. Recipients cannot mark other recipients' claimed donations as picked up or completed.
- **Profile Privilege Escalation**: Tested sending `{ role: 'admin' }` to `PUT /api/users/profile`. Profile update logic explicitly destructures allowed fields and rejects role mutation.

### Core Donation Workflow & Lifecycle
Lifecycle state machine: `AVAILABLE` → `CLAIMED` → `PICKED UP` → `COMPLETED`

```
                      ┌──────────────────────────────────────┐
                      │              AVAILABLE               │
                      └──────────────────┬───────────────────┘
                                         │
                        [Recipient Claim (RACE CONDITION!)]
                                         │
                                         ▼
                      ┌──────────────────────────────────────┐
                      │               CLAIMED                │
                      └──────────────────┬───────────────────┘
                                         │
                                [Recipient Pickup]
                                         │
                                         ▼
                      ┌──────────────────────────────────────┐
                      │              PICKED-UP               │
                      └──────────────────┬───────────────────┘
                                         │
                               [Recipient Complete]
                                         │
                                         ▼
                      ┌──────────────────────────────────────┐
                      │              COMPLETED               │
                      └──────────────────────────────────────┘
```

- **Transition Enforcements**:
  - Direct completion from `available` or `claimed` is correctly blocked (HTTP 400 `Donation must be picked up before completion`).
  - Marking an unclaimed donation as picked up is correctly blocked (HTTP 400 `Donation must be claimed before pickup`).
  - Deleting or editing a claimed donation is blocked.
- **Critical Failure 1 (Race Condition in Claiming)**:
  - Under live concurrent load testing with 2 simultaneous claim requests from Recipient A and Recipient B, **both requests returned HTTP 200 OK**.
  - Root Cause: `findById` followed by an in-memory `if (donation.status !== 'available')` check and `save()` does not lock the document or use an atomic condition.
  - Required Fix: Use atomic `findOneAndUpdate({ _id: id, status: 'available' }, { status: 'claimed', claimedBy: ... }, { new: true })`.
- **Critical Failure 2 (Mass Assignment on Donation Update)**:
  - In `PUT /api/donations/:id`, `Object.assign(donation, req.body)` blindly merges user-provided JSON.
  - Live testing confirmed that sending `{ "status": "completed", "donor": "<attacker_id>" }` successfully mutated both fields in MongoDB, bypassing the state machine and transferring ownership.

### Real-Time / Socket.IO Audit
1. **Connection & Rooms**: Server creates Socket.IO with CORS. Frontend joins rooms `user.role` and `user-${user._id}` upon connection.
2. **Event Disconnect**:
   - Backend emits:
     - `io.emit('new-donation', { donation })` on creation.
     - `io.emit('donation-claimed', { donationId, recipient })` on claim.
   - Frontend listens to:
     - `newSocket.on('donation-created', ...)`
     - `newSocket.on('request-created', ...)`
     - `newSocket.on('volunteer-assigned', ...)`
     - `newSocket.on('delivery-completed', ...)`
   - **Result**: Due to the naming mismatch (`new-donation` vs `donation-created`), zero donation notifications appear in the UI. No handler exists in frontend for `donation-claimed`.

### Integrations (Email, SMS, Geocoding, Image Upload)
1. **Email (Nodemailer)**:
   - `createTransporter()` correctly returns `null` when environment variables are missing.
   - `sendWelcomeEmail` checks `if (!transporter) return;`.
   - **Bug**: `sendDonationNotification`, `sendClaimNotification`, and `sendPickupReminder` do NOT check for `null`. When email credentials are omitted (the default state in `.env.example`), calling these functions triggers `TypeError: Cannot read properties of null (reading 'sendMail')`.
2. **SMS (Twilio)**:
   - `smsService.js` contains wrapper functions for Twilio.
   - **Bug**: It is completely dead code. No controller or route imports or invokes `smsService.js`.
3. **Geocoding (Node-geocoder)**:
   - `geocoder.js` contains Google Maps integration with fallback coordinates.
   - **Bug**: It is completely dead code. `donations.js` hardcodes `coordinates: [0, 0]` on line 167 without calling `geocoder.js`.
4. **Image Upload (Multer)**:
   - `multer` is in `package.json` dependencies and cited in the README.
   - **Bug**: No route imports Multer or handles `multipart/form-data`. `POST /api/donations` only handles JSON. The frontend `CreateDonation.js` form has no image input.

### Database Audit (Mongoose & Atlas)
1. **Collections**: `users`, `donations`.
2. **User Indexes**:
   - `_id_`
   - `email_1` (unique)
   - `profile.location_2dsphere` (on `profile.location`)
   - `profile.firstName_text_profile.lastName_text_email_text_profile.organization_text`
3. **Donation Indexes**:
   - `_id_`
   - `location.coordinates_2dsphere` (on `location.coordinates`)
   - `status_1_pickupWindow.startTime_1`
   - `donor_1_status_1`
   - `claimedBy.recipient_1`
   - `title_text_description_text`
4. **Validation Conflict**:
   - `server/models/Donation.js:30`: `quantity.amount` has `min: 1`.
   - `server/routes/donations.js:116`: `body('quantity.amount').isFloat({ min: 0.1 })`.
   - A donation created with `quantity.amount = 0.5` passes route validation but fails at Mongoose save with HTTP 500 ValidationError.
5. **Geospatial Index Mismatch**:
   - In `User.js`, index is defined on `profile.location`.
   - In `server/routes/users.js:252`, query is executed against `'profile.location.coordinates'`.
   - MongoDB throws `NoQueryExecutionPlans: unable to find index for $geoNear query`, causing HTTP 500 on `GET /api/users/nearby-recipients`.

---

## 7. README vs Actual Implementation Audit

| README Claimed Feature | Actually Implemented in Code? | Actually Working? | Evidence & Audit Findings |
| :--- | :--- | :--- | :--- |
| **Secure Registration / Login** | Yes | Yes | Bcrypt hashing, email normalization, validation rules confirmed working. |
| **JWT with Refresh Tokens** | Yes | Yes | 15-min access token and 7-day refresh token rotation confirmed working. |
| **Role-Based Access Control** | Yes | Yes | Middleware correctly restricts donors, recipients, and admins on valid routes. |
| **Create Donation Form** | Yes | Partially | JSON form creates donations, but fallback coordinates hardcoded; image upload missing. |
| **Image Upload (Multer)** | **No** | **No** | Multer is never imported in server code. No upload route exists. No file input in frontend. |
| **Recipient Browse & Filter** | Yes | Yes | Text search, foodType filter, and status filter confirmed working against MongoDB. |
| **Claim Donations** | Yes | **Broken under concurrency** | Sequential claims work; simultaneous claims suffer critical race condition. |
| **Real-time Status Tracking** | Partially | **No** | Socket.IO connects, but event names mismatch (`new-donation` vs `donation-created`). |
| **Email Notifications** | Partially | **Broken** | Welcome email works; claim and donation notifications throw TypeError if SMTP is omitted. |
| **SMS Notifications (Twilio)**| **No** | **No** | `smsService.js` is never imported or called in any controller. |
| **Geospatial Queries** | Partially | **Broken on users** | Donation near queries work; `/api/users/nearby-recipients` crashes with 500 index error. |
| **Node-geocoder Integration** | **No** | **No** | `geocoder.js` is never imported; donations fallback to hardcoded `[0, 0]`. |
| **Admin Panel (User Management)**| Partially | Partially | Can view users and toggle active status; cannot change user role or delete users. |
| **Admin Panel (System Settings)**| **No** | **No** | Settings buttons ("SMTP Gateway Config", "Twilio Integrations") have no click handlers. |
| **Admin Reminders** | **No** | **No** | Inactive user and pickup reminder endpoints are empty mock stubs. |
| **Impact Analytics Dashboard** | Partially | **No (Mocked)** | `/analytics` page renders hardcoded numbers ("4,280 kg CO2") with no backend API integration. |
| **Community Requests (/requests)**| **No** | **No (Mocked)** | Requests stored only in temporary React `useState`; no backend model or database persistence. |
| **Logistics & Couriers (/volunteers)**| **No** | **No (Mocked)** | Couriers and delivery dispatches are static in-memory arrays; GPS tracking is a local interval loop. |
| **Interactive Map (/map)** | Partially | **No (Mocked)** | Leaflet renders, but all 4 marker coordinates are hardcoded; no real database donations fetched. |
| **Backend Test Suite** | **No** | **No** | `server/test/test.js` crashes immediately (`Cannot find module 'supertest'`). |

---

## 8. Master Bug Table

| ID | Severity | Category | File | Function / Location | Problem Description | Reproduction Steps | Root Cause | Recommended Fix |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-01** | **CRITICAL** | Concurrency / Database | `server/routes/donations.js` | `POST /:id/claim` (Lines 263–291) | Double-claim race condition allows multiple recipients to simultaneously claim the same donation. | Send concurrent HTTP POST requests to `/api/donations/<id>/claim` using two different recipient tokens. | Non-atomic check-then-act (`findById` then in-memory check then `save()`). | Use `Donation.findOneAndUpdate({ _id: req.params.id, status: 'available' }, { status: 'claimed', claimedBy: { recipient: req.user._id, claimedAt: new Date() } }, { new: true })`. If null returned, return HTTP 400. |
| **BUG-02** | **CRITICAL** | Security / AuthZ | `server/routes/donations.js` | `PUT /:id` (Lines 248–249) | Mass assignment vulnerability allows donors to overwrite protected fields (`status`, `donor`, `claimedBy`). | Send `PUT /api/donations/<id>` with body `{ "status": "completed", "donor": "<attacker_id>" }`. | `Object.assign(donation, req.body)` copies all payload properties directly onto the Mongoose document. | Whitelist updatable fields: only assign `title`, `description`, `foodType`, `quantity`, `pickupWindow`, `location`, `allergens`, `specialInstructions`. |
| **BUG-03** | **CRITICAL** | Frontend / Runtime | `client/src/context/AuthContext.js` & `Register.js` | `register` (Lines 349–355) & `Register.js:208` | React runtime crash when registration validation fails because an array of error objects is passed to JSX. | Submit registration form with an invalid email (e.g. `invalid-email`). | `setError` receives `error.response.data.errors` (array of objects), which React rejects as a child of `<Alert>`. | Extract string error: `const message = error.response?.data?.errors?.[0]?.msg \|\| error.response?.data?.message \|\| 'Registration failed'; setError(message);`. |
| **BUG-04** | **HIGH** | Database / Geolocation | `server/routes/users.js` & `server/models/User.js` | `GET /nearby-recipients` (Lines 249–261) | Endpoint crashes with HTTP 500 due to missing 2dsphere index on query path. | Send `GET /api/users/nearby-recipients?latitude=40.71&longitude=-74.00` with authenticated donor token. | Query targets `'profile.location.coordinates'`, but index in `User.js:91` is defined on `'profile.location'`. | Change query filter to `'profile.location': { $near: { $geometry: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] }, $maxDistance: ... } }`. |
| **BUG-05** | **HIGH** | Integration / Stability | `server/services/emailService.js` | `sendDonationNotification`, `sendClaimNotification`, `sendPickupReminder` | Unhandled `TypeError: Cannot read properties of null (reading 'sendMail')` whenever SMTP credentials are unset. | Create a donation or claim a donation without SMTP credentials in `.env`. | `createTransporter()` returns `null`, but these functions call `transporter.sendMail()` without a null guard. | Add guard: `if (!transporter) return;` at the start of all three email notification functions. |
| **BUG-06** | **HIGH** | Error Handling | `server/routes/donations.js`, `users.js`, `admin.js` | `GET /:id`, `PUT /:id`, `DELETE /:id` | Invalid MongoDB ObjectId strings cause unhandled CastErrors returning HTTP 500 instead of 400 or 404. | Send `GET /api/donations/not-a-valid-id`. | Mongoose throws `CastError` during query casting, caught by generic catch block returning HTTP 500. | Validate `mongoose.Types.ObjectId.isValid(req.params.id)` or add Mongoose CastError check in error middleware: `if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid ID format' });`. |
| **BUG-07** | **HIGH** | Real-Time / Socket.IO | `server/routes/donations.js` & `client/src/context/NotificationContext.js` | `donations.js:192` vs `NotificationContext.js:80` | Real-time notifications never trigger on the frontend due to mismatched event names. | Create a donation from Donor session; inspect recipient browser session. | Server emits `'new-donation'`; frontend listens for `'donation-created'`. Server emits `'donation-claimed'`, frontend has no listener. | Standardize event names across client and server: use `'donation-created'` and implement listener for `'donation-claimed'`. |
| **BUG-08** | **HIGH** | Validation / Data Integrity | `server/models/Donation.js` & `server/routes/donations.js` | `Donation.js:30` vs `donations.js:116` | Validation conflict: route accepts decimal quantity (min: 0.1), but Mongoose schema enforces integer/min: 1. | Create donation with `quantity: { amount: 0.5, unit: "pounds" }`. | Express-validator passes `isFloat({ min: 0.1 })`, but Mongoose schema validator specifies `min: 1`, throwing ValidationError on save. | Update `server/models/Donation.js:30` to `min: 0.1` to match express-validator. |
| **BUG-09** | **MEDIUM** | Incomplete Feature | `server/` & `client/src/pages/CreateDonation.js` | Entire upload pipeline | Image upload claimed in README and dependencies is completely unimplemented. | Attempt to attach photo when creating a donation. | Multer middleware was never configured on `POST /api/donations`; no input rendered in frontend form. | Mount Multer upload middleware on `POST /api/donations` and add file picker to `CreateDonation.js`. |
| **BUG-10** | **MEDIUM** | Dead Code | `server/services/smsService.js` | Entire file | Twilio SMS notification service is completely dead and unreferenced. | Search codebase for `smsService` imports. | Service was authored but never imported into `donations.js` or `admin.js`. | Import `smsService` and invoke `sendClaimNotificationSMS` on claim, or remove unused dependency. |
| **BUG-11** | **MEDIUM** | Dead Code | `server/utils/geocoder.js` & `routes/donations.js` | `donations.js:167` | Geocoder utility is unreferenced; donation coordinates default to `[0, 0]`. | Create a donation with street address; inspect `location.coordinates` in database. | `donations.js` hardcodes fallback `[0, 0]` without invoking `geocodeAddress()` from `geocoder.js`. | Import `geocoder.js` in `donations.js` and call `geocodeAddress(address)` during donation creation. |
| **BUG-12** | **MEDIUM** | Incomplete Feature | `server/routes/admin.js` | `/reminders/inactive-users`, `/reminders/pickup` (Lines 282–335) | Admin reminders endpoints are mock stubs that do not deliver communications. | Call `POST /api/admin/reminders/inactive-users` as admin. | Code queries MongoDB, logs count to console, and returns JSON without invoking any email/SMS dispatch. | Integrate `sendWelcomeEmail` or `sendPickupReminder` loops over the queried user array. |
| **BUG-13** | **MEDIUM** | UI / Logic Bug | `client/src/pages/DonationDetail.js` | Lines 355 & 401 | Unauthenticated users can never see the "Login to Claim" button on donation detail view. | Visit `/donations/<id>` while logged out. | Condition `{!user && ...}` is nested inside an outer `{user && ( ... )}` JSX block. | Move the `{!user && ( ... )}` action card outside the `{user && ( ... )}` guard. |
| **BUG-14** | **MEDIUM** | Incomplete Feature | `client/src/pages/Requests.js`, `Volunteers.js`, `Analytics.js`, `MapPage.js` | Entire pages | 4 full platform pages are client-side visual mockups without database or backend persistence. | Submit a request on `/requests`, or register as courier on `/volunteers`, then refresh the page. | State resides in component `useState` or static hardcoded arrays. | Create backend schemas/routes for Requests and Logistics, or label them as prototype modules. |
| **BUG-15** | **MEDIUM** | Configuration / Security | `.env` | `JWT_SECRET` | Active `.env` uses a 21-character secret, violating `.env.example` security guideline (`min_32_chars`). | Inspect line 5 of `.env`. | Short string configured in development environment. | Generate 64-byte cryptographic random hex string for production deployment. |
| **BUG-16** | **MEDIUM** | QA / DevOps | `server/test/test.js` & root `package.json` | Test execution | Backend unit tests fail to run out of the box due to missing test framework. | Run `node server/test/test.js`. | `supertest` is required on line 1 but omitted from `devDependencies`; no test runner script configured. | Install `jest` and `supertest` in `devDependencies` and add `"test": "jest server/test"` to `package.json`. |
| **BUG-17** | **LOW** | Code Quality / Lint | `client/src/App.test.js` | Line 103 | ESLint error fails static checks due to non-top import. | Run `npx eslint src/` in `client/`. | `import App from './App'` placed on line 103 after mock definitions. | Reorder imports to the top of the file or configure jest test file rule overrides. |
| **BUG-18** | **LOW** | Performance | `server/routes/auth.js` | `POST /register` (Lines 89 & 96) | Redundant double database save on user registration. | Register a new user. | `await user.save()` is executed before generating tokens, then `user.refreshToken = refreshToken; await user.save()` executes again. | Assign `user.refreshToken = generateTokens(user._id).refreshToken` before the initial `await user.save()`. |
| **BUG-19** | **LOW** | Error Handling | `server/routes/auth.js` | `POST /register` (Line 113) | Duplicate email race condition causes HTTP 500 instead of HTTP 409 Conflict. | Send concurrent registration requests with the same email. | MongoDB duplicate key error `E11000` is unhandled and caught by generic 500 handler. | Add `if (error.code === 11000) return res.status(409).json({ message: 'User with this email already exists' });`. |
| **BUG-20** | **LOW** | Documentation | `README.md` & `server/routes/` | API documentation | Endpoint routes in README mismatch actual server routes. | Compare README API table with Express route mounts. | README specifies `PUT /api/admin/users/:id` (actual: `PATCH /status`) and `/api/users/claims` (actual: `/claimed-donations`). | Update `README.md` to document the exact HTTP methods and paths implemented. |

---

## 9. Final Verification Lists

### A. Confirmed Working (Empirically Tested)
- Public health check endpoint (`GET /api/health`).
- Public platform statistics endpoint (`GET /api/stats/public`).
- User registration with email validation and role constraints (`donor`, `recipient`).
- Prevention of self-admin promotion during registration.
- Duplicate email rejection (HTTP 409 under normal sequential requests).
- Password hashing with bcrypt (cost factor 12) confirmed in MongoDB.
- Absence of plaintext passwords and refresh tokens in API public profile payloads.
- Valid user authentication and JWT access/refresh token generation.
- Rejection of invalid passwords and nonexistent accounts (HTTP 401).
- Token refresh exchange via `POST /api/auth/refresh`.
- Refresh token invalidation upon user logout (`POST /api/auth/logout`).
- Rejection of tampered refresh tokens.
- RBAC middleware blocking unauthenticated and unauthorized roles from `/api/admin/*`.
- Profile role immutability during `PUT /api/users/profile`.
- Password change flow verifying current password against stored bcrypt hash (`PUT /api/users/password`).
- Legitimate donation creation by verified donors (`POST /api/donations`).
- Server-side rejection of invalid donations (empty title, negative quantity, invalid food type).
- Donor prevention from claiming donations (HTTP 403).
- Legitimate single-recipient claiming of available donations (`POST /api/donations/:id/claim`).
- Rejection of claims on already claimed donations (HTTP 400).
- Legitimate pickup marking by claiming recipient (`POST /api/donations/:id/pickup`).
- Legitimate completion marking by claiming recipient (`POST /api/donations/:id/complete`).
- IDOR protection blocking non-owner donors from editing or deleting donations.
- IDOR protection blocking non-claiming recipients from picking up or completing claims.
- Admin retrieval of overview statistics and monthly aggregate trends (`GET /api/admin/stats`).
- Admin user listing and active status toggling (`PATCH /api/admin/users/:id/status`).
- Deactivated user session rejection upon login attempt.
- Admin override deletion of donations (`DELETE /api/admin/donations/:id`).
- Frontend production bundle build (`react-scripts build`).

### B. Confirmed Broken (Empirically Reproduced or Verified with Strong Code Evidence)
- **Claiming Concurrency Race Condition**: Simultaneous claims on the same listing both succeed with HTTP 200, corrupting donation state (Reproduced in test suite).
- **Mass Assignment Vulnerability**: `PUT /api/donations/:id` overwrites `status` and `donor` with any arbitrary JSON sent by the client (Reproduced in test suite).
- **Frontend Registration Crash**: Submitting invalid registration data crashes the React component with `Objects are not valid as a React child` (Verified in `AuthContext.js:349`).
- **Geospatial User Query Crash**: `GET /api/users/nearby-recipients` crashes with HTTP 500 `unable to find index for $geoNear query` (Reproduced in test suite and server logs).
- **Email Service TypeError**: `sendDonationNotification` and `sendClaimNotification` throw `TypeError: Cannot read properties of null (reading 'sendMail')` when SMTP is unconfigured (Reproduced in server logs).
- **Invalid ObjectId 500 Errors**: Passing non-ObjectId strings to `/api/donations/:id` returns HTTP 500 CastError instead of 400 or 404 (Reproduced in test suite).
- **Real-Time Notification Failure**: Socket.IO event name mismatch (`new-donation` emitted vs `donation-created` listened) results in zero real-time UI notifications (Reproduced in test suite).
- **Quantity Validation Inconsistency**: Schema rejects quantities under 1, but route validator allows 0.1, causing unhandled 500 ValidationErrors on decimal quantities (Verified in `Donation.js:30`).
- **Hidden Claim CTA for Guests**: In `DonationDetail.js`, the "Login to Claim" CTA button is unreachable due to contradictory boolean nesting `{user && ( ... {!user && ...} )}` (Verified in `DonationDetail.js:355, 401`).
- **Backend Test Runner Failure**: `node server/test/test.js` throws `Cannot find module 'supertest'` (Reproduced in terminal).
- **ESLint Error in Client Tests**: `client/src/App.test.js:103:1` fails lint checks due to `import/first` (Reproduced in terminal).
- **README Endpoint Inconsistencies**: Documented endpoints `/api/users/claims` and `PUT /api/admin/users/:id` do not match implemented routes (Verified against router definitions).

### C. Unverified / Blocked / Mocked
- **Browser Interactive UI Session**: Blocked by Playwright driver binary download 404 from Azure CDN in test environment (`playwright.azureedge.net/builds/driver/playwright-1.57.0-linux.zip`).
- **Live SMTP Delivery**: Unverified due to omitted SMTP credentials in `.env` (live email delivery to external inboxes cannot be tested).
- **Live Twilio SMS Delivery**: Unverified due to omitted Twilio credentials in `.env`; further blocked because `smsService.js` is not wired to any endpoint.
- **Google Maps Geocoding Accuracy**: Unverified due to omitted `GOOGLE_MAPS_API_KEY`; further blocked because `geocoder.js` is not wired to donation creation.
- **Multer File Upload**: Unverified because the feature is completely non-existent in backend routes and frontend components despite README claims.
- **Requests & Logistics Persistence**: Unverified because `/requests`, `/volunteers`, and `/map` are purely client-side React UI mockups with no backend models or database persistence.
- **Production SSL & Reverse Proxy**: Blocked due to local environment execution (tested under HTTP `localhost:5000` / `localhost:3000`).

---

## 10. Recommended Remediation Roadmap

The audit phase is complete. Below is the technical remediation sequence when you are ready to proceed with fixes:

1. **Phase 1: Critical Security & Concurrency Fixes**
   - Refactor `POST /api/donations/:id/claim` to use atomic `findOneAndUpdate` with status preconditions to eliminate double claiming.
   - Restrict `PUT /api/donations/:id` to an explicit whitelist of editable fields to close the mass assignment vulnerability.
   - Fix `AuthContext.js` registration error handling to extract error string messages and prevent React runtime crashes.
2. **Phase 2: Database & Stability Fixes**
   - Correct the geospatial query in `server/routes/users.js` from `'profile.location.coordinates'` to `'profile.location'` to resolve the 500 error.
   - Synchronize `quantity.amount` min values between `Donation.js` (`min: 0.1`) and `donations.js`.
   - Add Mongoose CastError handling to central error middleware to return clean HTTP 400/404 responses for malformed ObjectIds.
   - Add null checks to `sendDonationNotification`, `sendClaimNotification`, and `sendPickupReminder` in `emailService.js`.
3. **Phase 3: Real-Time & Frontend Logic Fixes**
   - Standardize Socket.IO event names between backend emissions (`donation-created`) and frontend listeners.
   - Fix the nested boolean guard in `DonationDetail.js` so unauthenticated visitors see the "Login to Claim" CTA.
   - Fix ESLint error in `App.test.js`.
4. **Phase 4: Integrations, Stubs & Tests**
   - Wire `geocoder.js` to donation creation address inputs.
   - Install `supertest` and configure a functional `npm test` script for the backend.
   - Align `README.md` with actual endpoint signatures.
