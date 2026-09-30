#!/usr/bin/env node
// Orchestrates the entire GIS platform from one command: `npm run start`
// in `main application`. Brings up Mongo (docker), then every module's
// frontend/backend, with labeled/colored output. Ctrl+C stops everything.
//
// Add or remove a module by editing the SERVICES array below.

const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..'); // .../Geographic-Information-System
const MAIN_APP = path.resolve(__dirname, '..'); // .../main application

const COLORS = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

// ---------------------------------------------------------------------
// One-off setup: make sure Mongo is up before anything tries to connect.
// ---------------------------------------------------------------------
function ensureMongo() {
  console.log(`${COLORS.gray}[setup] checking MongoDB container "gis-mongo"...${COLORS.reset}`);
  const start = spawnSync('docker', ['start', 'gis-mongo'], { stdio: 'pipe' });
  if (start.status === 0) {
    console.log(`${COLORS.gray}[setup] gis-mongo container started.${COLORS.reset}`);
    return;
  }
  console.log(`${COLORS.gray}[setup] gis-mongo not found, creating it...${COLORS.reset}`);
  const run = spawnSync(
    'docker',
    ['run', '-d', '--name', 'gis-mongo', '-p', '27017:27017', '-v', 'gis-mongo-data:/data/db', 'mongo:7'],
    { stdio: 'inherit' }
  );
  if (run.status !== 0) {
    console.error(`${COLORS.red}[setup] Could not start MongoDB via Docker. Is Docker Desktop running?${COLORS.reset}`);
  }
}

const isWin = process.platform === 'win32';

// ---------------------------------------------------------------------
// Service registry
// ---------------------------------------------------------------------
const SERVICES = [
  {
    name: 'MAIN-BE',
    color: 'green',
    cwd: path.join(MAIN_APP, 'backend'),
    cmd: 'npm',
    args: ['run', 'dev'],
  },
  {
    name: 'MAIN-FE',
    color: 'green',
    cwd: MAIN_APP,
    cmd: 'npm',
    args: ['run', 'start:cra'],
  },
  {
    name: 'VIEWER-FE',
    color: 'cyan',
    cwd: path.join(ROOT, 'GIS-Viewer'),
    cmd: 'npm',
    args: ['run', 'start'],
  },
  {
    name: 'VIEWER-BE',
    color: 'cyan',
    cwd: path.join(ROOT, 'GIS-Viewer', 'backend'),
    cmd: 'npm',
    args: ['run', 'dev'],
  },
  {
    name: 'SURVEY-BE',
    color: 'magenta',
    cwd: path.join(ROOT, 'GIS-Survey', 'survey-backend'),
    cmd: 'npm',
    args: ['run', 'start'],
  },
  {
    name: 'SURVEY-FE',
    color: 'magenta',
    cwd: path.join(ROOT, 'GIS-Survey', 'survey-frontend'),
    cmd: 'npm',
    args: ['run', 'start'],
  },
  {
    name: '3D-BE',
    color: 'yellow',
    cwd: path.join(ROOT, 'GIS-3D', 'backend'),
    cmd: 'npm',
    args: ['run', 'start'],
  },
  {
    name: '3D-FE',
    color: 'yellow',
    cwd: path.join(ROOT, 'GIS-3D', 'frontend'),
    cmd: process.execPath, // node itself — sidesteps Windows .cmd shim quoting issues
    args: [path.join(MAIN_APP, 'node_modules', 'serve', 'build', 'main.js'), '-l', '3001', '.'],
    shell: false,
  },
  {
    name: 'WILD-FE',
    color: 'red',
    cwd: path.join(ROOT, 'GIS-Wild-life'),
    cmd: 'npm',
    args: ['run', 'dev', '--', '--port', '3003'],
  },
  {
    name: 'CONS-FE',
    color: 'white',
    cwd: path.join(ROOT, 'GIS-Construction', 'frontend'),
    cmd: 'npm',
    args: ['run', 'dev', '--', '--port', '3004'],
  },
  {
    name: 'CONS-BE',
    color: 'white',
    cwd: path.join(ROOT, 'GIS-Construction', 'backend'),
    cmd: isWin
      ? path.join(ROOT, 'GIS-Construction', 'backend', 'venv', 'Scripts', 'python.exe')
      : path.join(ROOT, 'GIS-Construction', 'backend', 'venv', 'bin', 'python'),
    args: ['main.py'],
    shell: false,
  },
  {
    name: 'ENV-FE',
    color: 'green',
    cwd: path.join(ROOT, 'GIS-environment'),
    cmd: 'npm',
    args: ['run', 'dev', '--', '--port', '3008'],
  },
  {
    name: 'IOT-BE',
    color: 'cyan',
    cwd: path.join(ROOT, 'iot-server'),
    cmd: 'npm',
    args: ['run', 'start'],
  },
  {
    name: 'DASH-BE',
    color: 'blue',
    cwd: path.join(ROOT, 'dashboard'),
    cmd: 'docker',
    args: ['compose', '-f', 'docker-compose.yml', 'up', '--build'],
    shell: false,
  },
];

// ---------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------
const children = [];

function prefixed(name, color, chunk) {
  const c = COLORS[color] || '';
  const label = `${c}[${name}]${COLORS.reset}`;
  chunk
    .toString()
    .split(/\r?\n/)
    .filter((line, i, arr) => !(i === arr.length - 1 && line === ''))
    .forEach((line) => console.log(`${label} ${line}`));
}

function launch(service) {
  if (!fs.existsSync(service.cwd)) {
    prefixed(service.name, service.color || 'gray', `${COLORS.gray}Directory "${service.cwd}" not found, skipping.${COLORS.reset}`);
    return null;
  }
  const useShell = service.shell !== false;
  const command = (isWin && service.cmd === 'npm') ? 'npm.cmd' : service.cmd;
  const sysRoot = process.env.SystemRoot || process.env.SYSTEMROOT || 'C:\\Windows';
  const comSpec = process.env.ComSpec || process.env.COMSPEC || path.join(sysRoot, 'System32', 'cmd.exe');

  // Prevent sub-modules (VIEWER-FE, SURVEY-FE, WILD-FE, CONS-FE, ENV-FE, etc.)
  // from opening unwanted browser tabs. ONLY MAIN-FE (port 3000) opens the browser.
  const env = { ...process.env, ComSpec: comSpec, COMSPEC: comSpec };
  if (service.name !== 'MAIN-FE') {
    env.BROWSER = 'none';
  }

  const child = spawn(command, service.args, {
    cwd: service.cwd,
    shell: useShell,
    env,
  });
  child.pid && children.push(child);

  child.on('error', (err) => {
    prefixed(service.name, 'red', `[ERROR] Could not start service: ${err.message}`);
  });

  if (child.stdout) child.stdout.on('data', (d) => prefixed(service.name, service.color, d));
  if (child.stderr) child.stderr.on('data', (d) => prefixed(service.name, service.color, d));
  child.on('exit', (code) => {
    prefixed(service.name, service.color, `${COLORS.gray}process exited (code ${code})${COLORS.reset}`);
  });
  return child;
}

function killAll() {
  console.log(`\n${COLORS.gray}[setup] shutting down all services...${COLORS.reset}`);
  for (const child of children) {
    if (child.killed || child.exitCode !== null) continue;
    if (isWin) {
      // Kill the whole process tree (npm/npx spawn nested node processes on Windows).
      spawnSync('taskkill', ['/pid', child.pid, '/t', '/f'], { stdio: 'ignore' });
    } else {
      child.kill('SIGTERM');
    }
  }
}

process.on('SIGINT', () => {
  killAll();
  process.exit(0);
});
process.on('SIGTERM', () => {
  killAll();
  process.exit(0);
});

ensureMongo();
console.log(`${COLORS.gray}[setup] launching ${SERVICES.length} services...${COLORS.reset}\n`);
SERVICES.forEach(launch);
