# GIS Platform - Standardized Port Assignment & AWS Hosting Plan

This document outlines the standardized `300X` (Frontend) and `400X` (Backend) port allocation scheme for the **GIS COJAG** platform, along with critical AWS production deployment guidelines to ensure smooth hosting on an AWS server (EC2 / ECS / Nginx).

---

## 🎯 Target Port Mapping Scheme

### Application & Service Ports (`300X` / `400X` Scheme)

| Module / Service | Frontend Port | Backend / API Port | Component / Service Role |
| :--- | :---: | :---: | :--- |
| **Main Application** | **`3000`** | **`4000`** | Unified Portal UI (`3000`) & Master Auth API (`4000`) |
| **GIS 3D Terrain** | **`3001`** | **`4001`** | 3D WebGL Viewer (`3001`) & 3D Layer Assets API (`4001`) |
| **GIS Survey** | **`3002`** | **`4002`** | Survey Module UI (`3002`) & Survey REST API (`4002`) |
| **GIS Wild-Life** | **`3003`** | **`4003`** | Wildlife GIS UI (`3003`) & Video Processing API (`4003`) |
| **GIS Construction** | **`3004`** | **`4004`** | Drawing Digitizer UI (`3004`) & Python FastAPI OCR (`4004`) |
| **GIS Viewer** | **`3005`** | **`4005`** | Integrated Map Viewer UI (`3005`) & Map Server (`4005`) |
| **IoT Server** | **`3006`** | **`4006`** | Telemetry Dashboard (`3006`) & WebSockets Stream (`4006`) |
| **Drone GPS Dashboard** | **`3007`** | **`4007`** | Drone PHP Web Portal (`3007`) & GPS WebSocket Relay (`4007`) |

---

### Core Infrastructure Ports (Retained Unchanged)

| Infrastructure Engine | Port | Status | Purpose |
| :--- | :---: | :---: | :--- |
| 🍃 **MongoDB (`gis-mongo`)** | **`27017`** | 📌 **Unchanged** | Master NoSQL Database |
| ⚡ **Redis Pub/Sub** | **`6379`** | 📌 **Unchanged** | Real-Time GPS Message Broker |
| 🐬 **MySQL (`gis-dashboard-mysql`)** | **`3307`** | 📌 **Unchanged** | Host Port mapped to Container Port `3306` |

---

## 🚀 AWS Server Hosting & Production Guidelines

To prevent crashes, CORS errors, or security issues when hosting on AWS (EC2 / Ubuntu / Amazon Linux), follow these critical best practices:

### 1. Reverse Proxy (Nginx / ALB) - Ports 80 & 443
- **Do NOT open all 14 internal ports (`3000-4007`) directly in AWS Security Groups.**
- Use **Nginx** as a reverse proxy listening on **Port 80 (HTTP)** and **Port 443 (HTTPS)** with an SSL certificate (Let's Encrypt / Certbot).
- Route requests internally:
  - `http://your-domain.com/` $\rightarrow$ `http://127.0.0.1:3000` (Main Portal)
  - `http://your-domain.com/api/` $\rightarrow$ `http://127.0.0.1:4000` (Master Auth API)
  - `http://your-domain.com/ws/` $\rightarrow$ `http://127.0.0.1:4007` (WebSocket Stream)

### 2. WebSocket Reverse Proxy Configuration
Ensure Nginx is configured with HTTP/1.1 headers for WebSocket connections (`IOT-BE` on `4006` and Drone GPS on `4007`):
```nginx
location /ws/ {
    proxy_pass http://127.0.0.1:4007/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host $host;
}
```

### 3. AWS Security Group Rules
Only expose necessary public ports in the AWS Security Group:
- **Port 80 (HTTP)** - Public
- **Port 443 (HTTPS)** - Public
- **Port 22 (SSH)** - Restricted to your IP address
- *(Keep ports 3000-4007, 27017, 3307 internal to `127.0.0.1`)*

### 4. Dynamic Domain / Environment Variables
- Ensure all frontend `.env` files (`REACT_APP_API_BASE_URL`, `VITE_API_URL`) use the public AWS Elastic IP / Domain name instead of `localhost`.
- Update backend CORS settings (`allowedOrigins`) in Node.js & Python FastAPI scripts to accept your AWS domain/IP.

### 5. EC2 Instance Sizing Recommendation
- Running 13 Node/Python/PHP services + Docker containers (MongoDB, MySQL, Redis) simultaneously requires:
  - **Minimum:** `t3.medium` (2 vCPUs, 4 GB RAM)
  - **Recommended:** `t3.large` or `t3a.large` (2 vCPUs, 8 GB RAM)
  - *Avoid `t2.micro` / `t3.micro` to prevent Out-Of-Memory (OOM) process crashes.*

### 6. Process Manager (PM2 / Docker)
- On AWS Linux, manage Node.js processes using **PM2** (`npm install -g pm2`) or Docker Compose so services automatically restart on reboot or crash.

---

## 🛠️ Summary of Configuration Files Affected

### 1. `main application`
- [`main application/scripts/start-all.js`](file:///c:/Users/HP/Desktop/Github/COJAG/gis-app-2.0/main%20application/scripts/start-all.js): Service startup ports (`3001`, `3003`, `3004`)
- [`main application/package.json`](file:///c:/Users/HP/Desktop/Github/COJAG/gis-app-2.0/main%20application/package.json): React proxy targeting `http://localhost:4000`
- [`main application/backend/.env`](file:///c:/Users/HP/Desktop/Github/COJAG/gis-app-2.0/main%20application/backend/.env): `PORT=4000`, SSO Callbacks (`4002`, `4005`)

### 2. `GIS-3D`
- [`GIS-3D/backend/server.js`](file:///c:/Users/HP/Desktop/Github/COJAG/gis-app-2.0/GIS-3D/backend/server.js): Listen port `4001`, CORS origins (`3001` & AWS domain)
- [`GIS-3D/frontend/js/*.js`](file:///c:/Users/HP/Desktop/Github/COJAG/gis-app-2.0/GIS-3D/frontend/js/sewagePipeline.js): Update API target port to `4001`

### 3. `GIS-Survey`
- [`GIS-Survey/survey-backend/.env`](file:///c:/Users/HP/Desktop/Github/COJAG/gis-app-2.0/GIS-Survey/survey-backend/.env): `PORT=4002`, `MASTER_AUTH_URL=http://localhost:4000`
- [`GIS-Survey/survey-frontend/.env.local`](file:///c:/Users/HP/Desktop/Github/COJAG/gis-app-2.0/GIS-Survey/survey-frontend/.env.local): `REACT_APP_API_BASE_URL` set to AWS backend endpoint

### 4. `GIS-Wild-life`
- [`GIS-Wild-life/backend/.env`](file:///c:/Users/HP/Desktop/Github/COJAG/gis-app-2.0/GIS-Wild-life/backend/.env): `PORT=4003`

### 5. `GIS-Construction`
- [`GIS-Construction/backend/main.py`](file:///c:/Users/HP/Desktop/Github/COJAG/gis-app-2.0/GIS-Construction/backend/main.py): FastAPI port `4004`, CORS origins (`3004` & AWS domain)

### 6. `GIS-Viewer`
- [`GIS-Viewer/.env`](file:///c:/Users/HP/Desktop/Github/COJAG/gis-app-2.0/GIS-Viewer/.env): `PORT=4005`, `FRONTEND_URL`, `MASTER_AUTH_URL`
F
### 7. `iot-server`
- [`iot-server/server.js`](file:///c:/Users/HP/Desktop/Github/COJAG/gis-app-2.0/iot-server/server.js): Server port `4006`

### 8. `dashboard`
- [`dashboard/docker-compose.yml`](file:///c:/Users/HP/Desktop/Github/COJAG/gis-app-2.0/dashboard/docker-compose.yml): Exposed ports `- "3007:8080"` and `- "4007:8090"`
- [`dashboard/.env`](file:///c:/Users/HP/Desktop/Github/COJAG/gis-app-2.0/dashboard/.env): `WS_LISTEN_PORT=4007`
