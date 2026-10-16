# Running and deploying FoodShare

## Local development

Requires Node.js 22.13+ and a reachable MongoDB database. The existing `.env` has been preserved. Create a configuration file only if one does not already exist:

```bash
cd /home/ankesh/Documents/Projects/Food-Distribution-Platform
npm ci
npm ci --prefix client
cp -n .env.example .env
# Edit .env locally: MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET, CLIENT_URL.
npm run dev
```

Open `http://localhost:3000`. CRA proxies `/api` to port 5000. Socket.IO uses port 5000 in development. `npm run server` uses Node's built-in watch mode. `npm start` starts the API without watching. The backend waits for a successful MongoDB connection before listening.

For a new, isolated local MongoDB instance, if needed:

```bash
docker run -d --name foodshare-local-mongo \
  -p 127.0.0.1:27017:27017 \
  -v foodshare-local-mongo:/data/db mongo:8.2
```

This is a development database. Do not expose an unauthenticated MongoDB port publicly. Use your existing database rather than starting a second container if it already provides the configured URI.

## Administrator bootstrap

Self-registration permits donors and recipients. To create a new administrator, run `npm run admin:create` in an interactive terminal against the intended database. It asks for names, email and a hidden password, hashes the password using the existing User model, and refuses to change any existing account. Never put passwords in chat or command-line arguments. Confirm the database target locally before this operator action. The command is implemented and syntax-checked; it was not run against the user's database.

## Verification

```bash
npm run check:server
npm run lint
npm test
CI=true npm run test:client
npm run build
npm audit --omit=dev
npm audit --omit=dev --prefix client
```

Backend tests start a new disposable MongoDB instance on a local port, initialize indexes, and destroy only that temporary database on completion. They never load `.env`, and outbound integrations are disabled. The first test run needs internet access to download the official MongoDB 8.2.6 binary; later runs reuse `/tmp/food-mongo-binaries`. Tests require permission to bind loopback ports. The server suite includes its own socket client and does not require the frontend to be installed.

This project is JavaScript and has no configured TypeScript check. Server syntax, ESLint, tests and the production bundle are the applicable checks. CRA/Jest development dependencies still have advisories; see the implementation report. Do not run `npm audit fix --force`: its suggested CRA downgrade removes the working build tool.

## Production

Required settings:

- `NODE_ENV=production`.
- `MONGODB_URI` for the intended authenticated database, including an explicit database name. Configure network access, TLS, backups and recovery at the database provider.
- Independent `JWT_SECRET` and `JWT_REFRESH_SECRET` values of at least 32 characters, generated with a cryptographically secure generator. Missing/placeholder/shared keys stop startup. Rotating keys signs users out.
- `CLIENT_URL` containing exact HTTPS origins, comma-separated when needed. No wildcards. Both Express and Socket.IO use it.
- `PORT` (default 5000).
- A persistent, writable `UPLOAD_DIR` or persistent storage mounted at `/app/server/uploads` in the container. Back it up with database data. The app uses local disk storage, so multiple instances need shared storage or a future object-storage adapter.
- `TRUST_PROXY_HOPS` only when the number of trusted reverse proxies is known. Leaving it unset is safer than trusting arbitrary forwarded IPs. The in-memory rate limiter is per process; a shared limiter is needed for horizontally scaled deployments.

Serve the app behind a TLS reverse proxy that supports Socket.IO/WebSocket upgrades and forwards the correct client address. `/api/health` returns 200 only with a connected database, otherwise 503; `/api/live` checks the process. Allow SIGTERM enough time for the ten-second shutdown window.

```bash
npm ci
npm ci --prefix client
npm run build
# Supply the required production variables through your host's secret/config manager.
NODE_ENV=production npm start
```

Express serves `client/build`, supports direct SPA route navigation and returns JSON 404s for unknown API or upload paths. The production frontend defaults to `/api`, avoiding localhost URLs. For a separately hosted frontend, set `REACT_APP_API_URL` and optionally `REACT_APP_SOCKET_URL` **before building**, and configure API CORS to the frontend HTTPS origin. Client build variables are public; never place secrets in them.

## Container

```bash
docker build -t foodshare:local .
# Supply environment variables securely; mount persistent uploads before running.
# Example shape (replace values through your deployment/secret manager):
# docker run -d --env-file /secure/path/foodshare.env \
#   -p 127.0.0.1:5000:5000 -v foodshare-uploads:/app/server/uploads foodshare:local
```

The image builds the existing CRA application, installs only backend runtime dependencies in the final stage, runs as `node`, excludes `.env`/user uploads/test files from its context, and includes a database-aware health check. A local image build was verified. No image was pushed, no production service was started, and no external deployment was performed.

## Optional integrations and operating limits

SMTP uses `EMAIL_HOST`, `EMAIL_PORT` (587 by default, or 465 with implicit TLS), `EMAIL_USER`, and `EMAIL_PASS`. Twilio uses `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER`. Google geocoding uses `GOOGLE_MAPS_API_KEY`. Verify actual provider delivery and quotas before launch. Without a geocoding key, unknown locations remain unmapped rather than receiving invented coordinates. Existing records that previously received fallback New York coordinates need operator review; this upgrade does not rewrite user records.

The map loads OpenStreetMap tiles and fonts load from Google; offline use falls back to system fonts and addresses, with no promise of offline map tiles. In-app claim/pickup/completion/cancellation notifications persist for 90 days; the inbox shows the latest 100 and counts all unread messages. New-listing alerts are live events; email discovery dispatch currently processes a bounded batch of 100 opted-in recipients per listing. Provider sends and notification writes are best effort, not a transactional outbox. Monitor failures and introduce a retry queue for larger deployments.

Pickup windows serve as the existing scheduling contract: claims can be made in advance, pickup requires the active window and unexpired food, and completion requires pickup. Donors may cancel before pickup. Independent courier accounts, courier vetting and GPS delivery tracking are not implemented; the old simulated volunteer board now shows real participant pickups. Inactive-user email campaigns explicitly return 501 rather than pretending to send messages.
