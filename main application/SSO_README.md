# Master Authentication / SSO — Implementation Notes

This documents what was built. See the architecture write-up for the full
design rationale (diagrams, flow-by-flow explanation).

## What's implemented now

- **Master Auth Server** (`Main application/backend/`) — new Node/Express +
  MongoDB service. Handles master login/register/logout/session, per-app
  authorization codes, server-to-server token exchange, and admin
  permission management. Serves the built React frontend from the same
  origin in production.
- **Main application frontend** — login page, session-aware dashboard,
  logout, and an SSO launcher that requests a one-time code before opening
  each app in the existing iframe/sidebar UI.
- **GIS-Viewer** (pilot) — new `/sso/callback` route that redeems the code
  server-to-server and creates a normal local session, alongside its
  existing local login (untouched).

## Not yet done (next increments)

- Add the same `/sso/callback` pattern to **GIS-3D**, **GIS-Construction**,
  **GIS-Survey**, and **GIS-Wildlife**. Survey and Wildlife are Node/Express
  (same pattern as Viewer's `ssoRoutes.js` — copy and adjust to their own
  `User` model). GIS-3D has no `User` model yet — one must be added first,
  same as Wildlife. GIS-Construction is FastAPI/Python and has no DB — needs
  a `users` table (SQLite/Postgres) and a Python equivalent of the callback
  route before it can participate.
- Admin UI for granting/revoking per-user app permissions (the API
  `/api/admin/permissions` exists; no frontend screen yet).
- Optional: master-logout propagation webhook (`/sso/revoke`) for instant
  cross-app revocation instead of relying on short session lifetimes.
- Optional: account-linking flow for existing Survey/Viewer users signing
  into Master with the same email.

## Environment variables

**Main application/backend** — see `.env.example` in that folder. Needs a
dedicated `MASTER_MONGO_URI`, a strong `MASTER_SESSION_SECRET`, its own
`FRONTEND_URL`, and one `SSO_SECRET_<APP>` shared secret per GIS app.

**Each participating GIS app's backend** additionally needs:
- `MASTER_AUTH_URL` — the Master Auth Server's deployed URL.
- `SSO_CLIENT_ID` — must match the key in `backend/config/apps.js` (e.g. `gis-viewer`).
- `SSO_CLIENT_SECRET` — must be the *same value* as that app's `SSO_SECRET_*` on Master.

Generate each secret independently:
```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Local dev quick start

```bash
# Master Auth Server
cd "Main application/backend"
cp .env.example .env   # fill in MASTER_MONGO_URI, MASTER_SESSION_SECRET, SSO_SECRET_GIS_VIEWER, FRONTEND_URL=http://localhost:3000
npm install
npm run dev             # listens on :4100

# Main application frontend (separate terminal)
cd "Main application"
npm install
npm start                # CRA dev server on :3000, proxies /api to :4100

# GIS-Viewer backend (separate terminal) — pilot app
cd GIS-Viewer/backend
# add to its .env: MASTER_AUTH_URL=http://localhost:4100, SSO_CLIENT_ID=gis-viewer,
# SSO_CLIENT_SECRET=<same value as SSO_SECRET_GIS_VIEWER above>
npm install
npm run dev               # listens on :5000
```

You'll also need at least one Master admin user before SSO can succeed. Open
the Main application, choose **Create account**, and make an account. If no
admin exists yet, that account is automatically marked as admin and granted
access to all registered GIS apps.

## Test matrix

| # | Scenario | Steps | Expected |
|---|---|---|---|
| 1 | Master login | Go to Main app, log in with valid credentials | Dashboard loads, session cookie set (httpOnly) |
| 2 | Open GIS-Viewer from sidebar | While logged into Master, click Viewer | Opens with no second login (SSO callback → local Viewer session) |
| 3 | Direct GIS-Viewer access | New browser/incognito, go straight to GIS-Viewer URL | Viewer's own login page shown; Master is never contacted |
| 4 | Direct GIS-Viewer login isolation | Log in directly on GIS-Viewer | Only Viewer authenticated; Main app / other 4 apps still show login |
| 5 | Unauthorized app | Log into Master as a user with no `AppPermission` row for `gis-3d` | Clicking 3D shows an access-denied message, no code issued |
| 6 | Master logout | Log out from Main app, then reopen sidebar app link | New `/authorize` call fails (401, no master session) — cannot mint a new SSO code |
| 7 | Expired/reused code | Replay a previously-used `?code=` value against `/sso/callback` | 401 from token exchange; friendly "expired or already used" message |
| 8 | Disabled user | Set a Master user's `status` to `disabled`, retry `/api/auth/session` and `/authorize` | Session cleared / 403, no new codes issued |
| 9 | New tab | Open a second tab of the Main app after logging in | Session cookie shared automatically (same browser, same origin) |
| 10 | Master server unavailable | Stop the Master backend, load Main app frontend | Login page shows a network-failure message, doesn't hang indefinitely |

## Rollback strategy

Every change is additive:
- No existing GIS app's local login/model/route was modified or removed —
  only a new `/sso/*` route was added (GIS-Viewer so far).
- The Main application's existing static behavior (iframe sidebar) still
  works unmodified for any module without an `appId` in `modules.js`.
- To roll back: stop/undeploy the `Main application/backend` service and
  revert `src/App.js`, `src/data/modules.js`, `src/components/FramePanel.js`
  to their pre-SSO versions (or simply don't deploy the new frontend build);
  GIS-Viewer's `/sso/callback` route is inert if `MASTER_AUTH_URL` /
  `SSO_CLIENT_SECRET` are unset — it 503s harmlessly and local login is
  unaffected.
