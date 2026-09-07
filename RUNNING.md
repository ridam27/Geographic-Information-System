# Running the GIS Platform

Step-by-step instructions to install and run the whole platform (main
dashboard + all GIS modules) on this machine.

## Prerequisites (one-time)

- Node.js 22+
- Python 3 (for the Construction module's OCR backend)
- Docker Desktop (runs MongoDB and the Dashboard backend)
- Redis running on `127.0.0.1:6379`

## 1. Install everything

From the repository root, run this once. It installs every Node project and
the Construction Python environment:

```
npm install
```

Re-run this any time after pulling new changes to pick up new dependencies.

## 2. Start prerequisites

Start Docker Desktop and make sure Redis is running on port `6379`. The
startup script automatically starts or creates the shared `gis-mongo`
container. The Dashboard's MySQL container is also started automatically.

## 3. Start everything with one command

From the repository root, run:

```sh
npm run start
```

This single command starts **all of the following** together, each with
labeled/colored console output:

| Label     | Module                       | Port        |
| --------- | ---------------------------- | ----------- |
| MAIN-FE   | Main dashboard (this app)    | 3000        |
| MAIN-BE   | Main auth/API backend        | 4000        |
| 3D-FE     | 3D Terrain frontend (static) | 3001        |
| 3D-BE     | 3D Terrain backend           | 4001        |
| SURVEY-FE | Survey frontend              | 3002        |
| SURVEY-BE | Survey backend               | 4002        |
| WILD-FE   | Wild Life frontend           | 3003        |
| WILD-BE   | Wild Life backend            | 4003        |
| CONS-FE   | Construction frontend        | 3004        |
| CONS-BE   | Construction Python backend  | 4004        |
| VIEWER-BE | GIS Viewer app & backend     | 3005 / 4005 |
| IOT-BE    | IoT sensor dashboard         | 4006        |
| DASH-BE   | Drone GPS Dashboard PHP/API  | 3007 / 4007 |

Wait for the logs to settle — the two React (CRA) apps (`MAIN-FE`,
`SURVEY-FE`) take the longest to compile (30–60s).

## 4. Open the dashboard

Go to **http://localhost:3000** in your browser and log in. All modules
(Viewer, Survey, 3D Terrain, Wild Life, Construction) load in-place from
the sidebar.

The **Environment** module opens a hosted app (`geo-environment-frontend.onrender.com`)
and needs no local setup — just an internet connection.

## 5. Stop everything

Press **Ctrl+C** in the terminal running `npm run start` — it shuts down
every service it started (including killing the underlying process
trees on Windows).

MongoDB keeps running in Docker afterwards (it's shared infra, not
restarted every time). To stop it too:

```
docker stop gis-mongo
```

---

## Dashboard (drone GPS) module

The Dashboard is started automatically through
`dashboard/docker-compose.yml`. Docker runs its PHP API on port `8080`, the
GPS WebSocket relay on port `8090`, and its MySQL database on host port `3307`.
PHP, Composer, and MySQL do not need to be installed on the host.

Open the main application at **http://localhost:3000**. The Dashboard module
opens at **http://localhost:8080**. Its GPS API can initially return an empty
dataset until a device posts data to `/api/insert_gps.php`.

---

## Troubleshooting

- **"Something is already running on port X"** — a leftover process is
  still bound to that port from a previous run. Find and kill it:
  ```
  Get-NetTCPConnection -LocalPort <PORT> -State Listen | Stop-Process -Id { $_.OwningProcess } -Force
  ```
- **`allowedHosts[0] should be a non-empty string`** — already fixed via
  `.env` files (`DANGEROUSLY_DISABLE_HOST_CHECK=true`) in `main
application` and `GIS-Survey/survey-frontend`. Don't remove these.
- **SSO / "Could not verify sign-in with the main portal"** — usually
  means MongoDB wasn't reachable yet when a backend started. Restart
  that backend once `docker start gis-mongo` has fully warmed up.
- **Docker not running** — start Docker Desktop from the Start menu
  first; `docker start gis-mongo` will fail silently otherwise and every
  backend will hang waiting for MongoDB.
