# Geographic Information System

A combined GIS platform: one main dashboard that hosts several
independent GIS modules (Viewer, Survey, 3D Terrain, Wild Life,
Construction, Environment, IoT, and a drone GPS dashboard).

## Quick Start

**Prerequisites**

- [Node.js](https://nodejs.org/) (v20+ recommended)
- [Python 3](https://www.python.org/) (used by the Construction module's OCR backend)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (runs the MongoDB database) — make sure it's running before step 3

**1. Clone and install**

```
git clone -b GIS-Application https://github.com/cojagtech/Geographic-Information-System.git
cd Geographic-Information-System
npm i
```

This single `npm i` installs every module's frontend and backend
dependencies, plus sets up the Python virtual environment for the
Construction module.

**2. Start everything**

```
npm run start
```

This one command starts the entire platform: the main dashboard, every
module's frontend/backend, and MongoDB (via Docker) — all together,
with labeled console output per service.

**3. Open the app**

Go to **http://localhost:3000** and log in. Every module is reachable
from the sidebar.

To stop everything, press **Ctrl+C** in the terminal.

## Full documentation

See [RUNNING.md](./RUNNING.md) for the detailed step-by-step guide,
including the full port table, troubleshooting tips, and notes on the
one module (drone GPS dashboard) that isn't wired into the one-command
startup yet.

## Structure

| Folder | What it is |
|---|---|
| `main application/` | The dashboard shell + auth backend that hosts all modules |
| `GIS-Viewer/` | Layered cartographic exploration |
| `GIS-Survey/` | Field data capture & benchmark logging |
| `GIS-3D/` | Volumetric elevation & 3D model view |
| `GIS-Construction/` | Engineering drawing digitization (OCR) |
| `GIS-Wild-life/` | Species tracking & habitat mapping |
| `GIS-environment/` | Climate & ecological monitoring |
| `iot-server/` | Live ESP32 sensor telemetry & pump control |
| `dashboard/` | Real-time drone GPS command center (PHP, separate setup) |
